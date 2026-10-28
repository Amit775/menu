import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ItemNotEditableError, type ItemRecord, ItemRepository } from '@menu/api/menus/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { MemoryPhotoStorage, PHOTO_STORAGE } from '@menu/api/shared/util-photos';
import { ItemPhotoService } from './item-photo.service';

describe('ItemPhotoService', () => {
  const owner: Principal = {
    accountId: 'o1',
    isAdmin: false,
    language: 'he',
    ownedVenueIds: ['v1'],
  };
  const diner: Principal = { ...owner, accountId: 'd1', ownedVenueIds: [] };
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 1, 2, 3]);

  function record(overrides: Partial<ItemRecord> = {}): ItemRecord {
    return {
      id: 'i1',
      venueId: 'v1',
      sectionId: 's1',
      name: { he: 'המבורגר', en: null },
      description: null,
      listPrice: null,
      tagIds: [],
      variations: [],
      state: 'approved',
      mergedIntoId: null,
      submittedById: null,
      position: 0,
      photoUrl: null,
      photoId: null,
      photoType: null,
      createdAt: '2026-10-01T00:00:00.000Z',
      ...overrides,
    };
  }

  let storage: MemoryPhotoStorage;

  async function setup(
    repository: Partial<Record<keyof ItemRepository, unknown>>,
  ): Promise<ItemPhotoService> {
    storage = new MemoryPhotoStorage();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ItemPhotoService,
        { provide: ItemRepository, useValue: repository },
        { provide: PHOTO_STORAGE, useValue: storage },
      ],
    }).compile();
    return moduleRef.get(ItemPhotoService);
  }

  it('lets the venue’s Owner set the photo, saving a fresh id before the bytes', async () => {
    const order: string[] = [];
    const setPhoto = vi.fn((_id: string, photo: { photoId: string }) => {
      order.push('id');
      return Promise.resolve(
        record({ photoId: photo.photoId, photoUrl: `/api/item-photos/${photo.photoId}` }),
      );
    });
    const photos = await setup({ findById: vi.fn().mockResolvedValue(record()), setPhoto });
    const put = storage.put.bind(storage);
    vi.spyOn(storage, 'put').mockImplementation((key, photo) => {
      order.push('bytes');
      return put(key, photo);
    });

    const item = await photos.set(owner, 'i1', jpeg);

    expect(order).toEqual(['id', 'bytes']);
    expect(storage.photos.get('items/i1')).toEqual({ bytes: jpeg, type: 'image/jpeg' });
    expect(setPhoto).toHaveBeenCalledWith('i1', {
      photoId: expect.stringMatching(/^[\w-]{22}$/) as unknown,
      photoType: 'image/jpeg',
    });
    expect(item.photoUrl).toMatch(/^\/api\/item-photos\/[\w-]{22}$/);
    expect(item).not.toHaveProperty('photoId');
  });

  it('forbids anyone but the venue’s Owner or an Admin', async () => {
    const photos = await setup({
      findById: vi.fn().mockResolvedValue(record()),
      setPhoto: vi.fn(),
    });
    await expect(photos.set(diner, 'i1', jpeg)).rejects.toThrow(ForbiddenException);
    await expect(photos.remove(diner, 'i1')).rejects.toThrow(ForbiddenException);
  });

  it('refuses an item that is no longer editable', async () => {
    const photos = await setup({
      findById: vi.fn().mockResolvedValue(record()),
      setPhoto: vi.fn().mockRejectedValue(new ItemNotEditableError()),
    });
    await expect(photos.set(owner, 'i1', jpeg)).rejects.toThrow(ConflictException);
    expect(storage.photos.size).toBe(0);
  });

  it('removes the photo and its bytes', async () => {
    const setPhoto = vi.fn().mockResolvedValue(record());
    const photos = await setup({ findById: vi.fn().mockResolvedValue(record()), setPhoto });
    await storage.put('items/i1', { bytes: jpeg, type: 'image/jpeg' });
    await photos.remove(owner, 'i1');
    expect(setPhoto).toHaveBeenCalledWith('i1', null);
    expect(storage.photos.has('items/i1')).toBe(false);
  });

  it('serves a photo by its id, and nothing for an unknown one', async () => {
    const findByPhotoId = vi
      .fn()
      .mockResolvedValueOnce(record({ photoId: 'abcdefghijklmnopqrstuv' }))
      .mockResolvedValueOnce(null);
    const photos = await setup({ findByPhotoId });
    await storage.put('items/i1', { bytes: jpeg, type: 'image/jpeg' });
    await expect(photos.read('abcdefghijklmnopqrstuv')).resolves.toEqual({
      bytes: jpeg,
      type: 'image/jpeg',
    });
    await expect(photos.read('abcdefghijklmnopqrstuv')).rejects.toThrow(NotFoundException);
  });

  it('fails with 404 for an unknown item', async () => {
    const photos = await setup({ findById: vi.fn().mockResolvedValue(null) });
    await expect(photos.set(owner, 'i1', jpeg)).rejects.toThrow(NotFoundException);
  });
});
