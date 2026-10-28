import { ConflictException, ForbiddenException, Logger, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  ItemNotEditableError,
  type ItemRecord,
  ItemRepository,
  VenueRepository,
} from '@menu/api/menus/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { MemoryPhotoStorage, PHOTO_STORAGE } from '@menu/api/shared/util-photos';
import { ItemPhotoService } from './item-photo.service';

describe('ItemPhotoService', () => {
  const owner: Principal = {
    accountId: 'o1',
    isAdmin: false,
    isContributor: false,
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
    venue: { id: string; status: string } | null = { id: 'v1', status: 'active' },
  ): Promise<ItemPhotoService> {
    storage = new MemoryPhotoStorage();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ItemPhotoService,
        { provide: ItemRepository, useValue: repository },
        { provide: PHOTO_STORAGE, useValue: storage },
        { provide: VenueRepository, useValue: { findById: vi.fn().mockResolvedValue(venue) } },
      ],
    }).compile();
    return moduleRef.get(ItemPhotoService);
  }

  it('lets the venue’s Owner replace the photo, storing the bytes under a fresh id first', async () => {
    const order: string[] = [];
    const setPhoto = vi.fn((_id: string, photo: { photoId: string }) => {
      order.push('id');
      return Promise.resolve(
        record({ photoId: photo.photoId, photoUrl: `/api/item-photos/${photo.photoId}` }),
      );
    });
    const old = 'oldPhotoIdoldPhotoId00';
    const photos = await setup({
      findById: vi.fn().mockResolvedValue(record({ photoId: old, photoType: 'image/jpeg' })),
      setPhoto,
    });
    await storage.put(`items/${old}`, { bytes: jpeg, type: 'image/jpeg' });
    const put = storage.put.bind(storage);
    vi.spyOn(storage, 'put').mockImplementation((key, photo) => {
      order.push('bytes');
      return put(key, photo);
    });

    const item = await photos.set(owner, 'i1', jpeg);

    expect(order).toEqual(['bytes', 'id']);
    const photoId = (setPhoto.mock.calls[0]?.[1] as { photoId: string }).photoId;
    expect(storage.photos.get(`items/${photoId}`)).toEqual({ bytes: jpeg, type: 'image/jpeg' });
    expect(storage.photos.has(`items/${old}`)).toBe(false);
    expect(setPhoto).toHaveBeenCalledWith('i1', {
      photoId: expect.stringMatching(/^[\w-]{22}$/) as unknown,
      photoType: 'image/jpeg',
    });
    expect(item.photoUrl).toMatch(/^\/api\/item-photos\/[\w-]{22}$/);
    expect(item).not.toHaveProperty('photoId');
  });

  it('lets a Contributor put a photo on any venue’s approved item', async () => {
    const contributor = { ...diner, isContributor: true };
    const setPhoto = vi.fn().mockResolvedValue(record({ photoId: 'p', photoType: 'image/jpeg' }));
    const photos = await setup({ findById: vi.fn().mockResolvedValue(record()), setPhoto });
    await photos.set(contributor, 'i1', jpeg);
    expect(setPhoto).toHaveBeenCalled();
  });

  it('hides someone else’s pending item from a Contributor', async () => {
    const contributor = { ...diner, isContributor: true };
    const photos = await setup({
      findById: vi.fn().mockResolvedValue(record({ state: 'pending', submittedById: 'u' })),
      setPhoto: vi.fn(),
    });
    await expect(photos.set(contributor, 'i1', jpeg)).rejects.toThrow(NotFoundException);
  });

  it('hides the items of a hidden venue from a Contributor, not from its Owner', async () => {
    const contributor = { ...diner, isContributor: true };
    const repository = { findById: vi.fn().mockResolvedValue(record()), setPhoto: vi.fn() };
    const hidden = { id: 'v1', status: 'hidden' };
    await expect((await setup(repository, hidden)).set(contributor, 'i1', jpeg)).rejects.toThrow(
      NotFoundException,
    );
    await expect((await setup(repository, hidden)).remove(contributor, 'i1')).rejects.toThrow(
      NotFoundException,
    );
    repository.setPhoto.mockResolvedValue(record());
    await (await setup(repository, hidden)).remove(owner, 'i1');
    expect(repository.setPhoto).toHaveBeenCalledTimes(1);
  });

  it('forbids anyone but the venue’s Owner, a Contributor or an Admin', async () => {
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
    const photoId = 'abcdefghijklmnopqrstuv';
    const setPhoto = vi.fn().mockResolvedValue(record());
    const photos = await setup({
      findById: vi.fn().mockResolvedValue(record({ photoId, photoType: 'image/jpeg' })),
      setPhoto,
    });
    await storage.put(`items/${photoId}`, { bytes: jpeg, type: 'image/jpeg' });
    await photos.remove(owner, 'i1');
    expect(setPhoto).toHaveBeenCalledWith('i1', null);
    expect(storage.photos.has(`items/${photoId}`)).toBe(false);
  });

  it('still removes the photo when its bytes cannot be deleted', async () => {
    const setPhoto = vi.fn().mockResolvedValue(record());
    const photos = await setup({
      findById: vi
        .fn()
        .mockResolvedValue(record({ photoId: 'abcdefghijklmnopqrstuv', photoType: 'image/jpeg' })),
      setPhoto,
    });
    vi.spyOn(storage, 'delete').mockRejectedValue(new Error('storage down'));
    const warn = vi.spyOn(Logger, 'warn').mockImplementation(() => undefined);
    await expect(photos.remove(owner, 'i1')).resolves.toMatchObject({ id: 'i1' });
    expect(warn).toHaveBeenCalled();
  });

  it('serves a photo by its id, and nothing for an unknown one', async () => {
    const findByPhotoId = vi
      .fn()
      .mockResolvedValueOnce(record({ photoId: 'abcdefghijklmnopqrstuv' }))
      .mockResolvedValueOnce(null);
    const photos = await setup({ findByPhotoId });
    await storage.put('items/abcdefghijklmnopqrstuv', { bytes: jpeg, type: 'image/jpeg' });
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
