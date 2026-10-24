import { NotFoundException, UnsupportedMediaTypeException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  type EntryRecord,
  EntryRepository,
  MemoryPhotoStorage,
  PHOTO_STORAGE,
} from '@menu/api/entries/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { PhotoService } from './photo.service';

describe('PhotoService', () => {
  const author: Principal = { accountId: 'a1', isAdmin: false, language: 'he', ownedVenueIds: [] };
  const other: Principal = { ...author, accountId: 'a2' };
  // Start of image, then straight to the image data.
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 1, 2, 3]);
  const exif = Buffer.from([0xff, 0xe1, 0x00, 0x05, 0x47, 0x50, 0x53]); // "GPS"
  const jpegWithExif = Buffer.concat([jpeg.subarray(0, 2), exif, jpeg.subarray(2)]);
  const gif = Buffer.from('GIF89a', 'latin1');

  function record(overrides: Partial<EntryRecord> = {}): EntryRecord {
    return {
      id: 'e1',
      authorId: 'a1',
      itemId: 'i1',
      venueId: 'v1',
      eatenAt: '2026-10-20T19:30:00.000Z',
      rating: 4,
      wouldOrderAgain: true,
      pricePaid: 6800,
      text: '',
      visibility: 'public',
      shareToken: null,
      hidden: false,
      photoUrl: null,
      photoId: null,
      photoType: null,
      createdAt: '2026-10-20T20:00:00.000Z',
      updatedAt: '2026-10-20T20:00:00.000Z',
      ...overrides,
    };
  }

  let storage: MemoryPhotoStorage;

  async function setup(
    repository: Partial<Record<keyof EntryRepository, unknown>>,
  ): Promise<PhotoService> {
    storage = new MemoryPhotoStorage();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PhotoService,
        { provide: EntryRepository, useValue: repository },
        { provide: PHOTO_STORAGE, useValue: storage },
      ],
    }).compile();
    return moduleRef.get(PhotoService);
  }

  it('stores a photo under the entry and gives it a fresh id', async () => {
    const setPhoto = vi.fn((_id: string, _author: string, photo: { photoId: string }) =>
      Promise.resolve(record({ photoId: photo.photoId, photoUrl: `/api/photos/${photo.photoId}` })),
    );
    const photos = await setup({ findById: vi.fn().mockResolvedValue(record()), setPhoto });

    const entry = await photos.set(author, 'e1', jpeg);

    expect(storage.photos.get('entries/e1')).toEqual({ bytes: jpeg, type: 'image/jpeg' });
    expect(setPhoto).toHaveBeenCalledWith('e1', 'a1', {
      photoId: expect.stringMatching(/^[\w-]{22}$/) as unknown,
      photoType: 'image/jpeg',
    });
    expect(entry.photoUrl).toMatch(/^\/api\/photos\/[\w-]{22}$/);
  });

  it('saves the new id before the bytes, so the old id never shows the new photo', async () => {
    const order: string[] = [];
    const setPhoto = vi.fn(() => {
      order.push('id');
      return Promise.resolve(record());
    });
    const photos = await setup({ findById: vi.fn().mockResolvedValue(record()), setPhoto });
    const put = storage.put.bind(storage);
    vi.spyOn(storage, 'put').mockImplementation((key, photo) => {
      order.push('bytes');
      return put(key, photo);
    });

    await photos.set(author, 'e1', jpeg);

    expect(order).toEqual(['id', 'bytes']);
  });

  it('stores nothing when the entry is gone by the time the id is saved', async () => {
    const photos = await setup({
      findById: vi.fn().mockResolvedValue(record()),
      setPhoto: vi.fn().mockResolvedValue(null),
    });

    await expect(photos.set(author, 'e1', jpeg)).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.photos.size).toBe(0);
  });

  it('drops the location and other metadata before storing', async () => {
    const photos = await setup({
      findById: vi.fn().mockResolvedValue(record()),
      setPhoto: vi.fn().mockResolvedValue(record()),
    });

    await photos.set(author, 'e1', jpegWithExif);

    expect(storage.photos.get('entries/e1')?.bytes).toEqual(jpeg);
  });

  it('refuses a photo whose file is broken', async () => {
    const photos = await setup({ findById: vi.fn().mockResolvedValue(record()) });

    await expect(
      photos.set(author, 'e1', Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0x40])),
    ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
  });

  it('refuses a file that is not a JPEG, PNG or WebP photo', async () => {
    const setPhoto = vi.fn();
    const photos = await setup({ findById: vi.fn().mockResolvedValue(record()), setPhoto });

    await expect(photos.set(author, 'e1', gif)).rejects.toBeInstanceOf(
      UnsupportedMediaTypeException,
    );
    expect(setPhoto).not.toHaveBeenCalled();
  });

  it("does not let anyone else set a photo on someone's entry", async () => {
    const setPhoto = vi.fn();
    const photos = await setup({ findById: vi.fn().mockResolvedValue(record()), setPhoto });

    await expect(photos.set(other, 'e1', jpeg)).rejects.toBeInstanceOf(NotFoundException);
    expect(storage.photos.size).toBe(0);
    expect(setPhoto).not.toHaveBeenCalled();
  });

  it('removes the photo and its stored bytes', async () => {
    const setPhoto = vi.fn().mockResolvedValue(record());
    const photos = await setup({
      findById: vi.fn().mockResolvedValue(record({ photoId: 'p'.repeat(22) })),
      setPhoto,
    });
    await storage.put('entries/e1', { bytes: jpeg, type: 'image/jpeg' });

    const entry = await photos.remove(author, 'e1');

    expect(setPhoto).toHaveBeenCalledWith('e1', 'a1', null);
    expect(storage.photos.size).toBe(0);
    expect(entry.photoUrl).toBeNull();
  });

  it('still removes the photo when the stored bytes cannot be deleted', async () => {
    const photos = await setup({
      findById: vi.fn().mockResolvedValue(record({ photoId: 'p'.repeat(22) })),
      setPhoto: vi.fn().mockResolvedValue(record()),
    });
    vi.spyOn(storage, 'delete').mockRejectedValue(new Error('bucket down'));

    await expect(photos.remove(author, 'e1')).resolves.toMatchObject({ photoUrl: null });
  });

  it('reads the photo behind a current id', async () => {
    const photos = await setup({
      findByPhotoId: vi.fn().mockResolvedValue(record({ photoId: 'p'.repeat(22) })),
    });
    await storage.put('entries/e1', { bytes: jpeg, type: 'image/jpeg' });

    await expect(photos.read('p'.repeat(22))).resolves.toEqual({ bytes: jpeg, type: 'image/jpeg' });
  });

  it('treats an old or unknown photo id as missing', async () => {
    const photos = await setup({ findByPhotoId: vi.fn().mockResolvedValue(null) });
    await storage.put('entries/e1', { bytes: jpeg, type: 'image/jpeg' });

    await expect(photos.read('x'.repeat(22))).rejects.toBeInstanceOf(NotFoundException);
  });
});
