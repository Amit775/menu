import { Test } from '@nestjs/testing';
import { type Principal } from '@menu/api/shared/util-auth';
import { ItemPhotoService } from './item-photo.service';
import {
  ItemController,
  ItemPhotoController,
  ItemPhotoReadController,
  VenueItemController,
} from './item.controller';
import { ItemService } from './item.service';

describe('ItemController', () => {
  const principal: Principal = { accountId: 'u', isAdmin: true, language: 'he', ownedVenueIds: [] };

  async function setup(service: Partial<Record<keyof ItemService, unknown>>) {
    const moduleRef = await Test.createTestingModule({
      controllers: [ItemController, VenueItemController],
      providers: [{ provide: ItemService, useValue: service }],
    }).compile();
    return { items: moduleRef.get(ItemController), venueItems: moduleRef.get(VenueItemController) };
  }

  it('passes a decision to the service', async () => {
    const decide = vi.fn().mockResolvedValue({});
    await (await setup({ decide })).items.decide(principal, 'i1', 'approve');
    expect(decide).toHaveBeenCalledWith(principal, 'i1', 'approve');
  });

  it('passes the merge target to the service', async () => {
    const merge = vi.fn().mockResolvedValue({});
    await (await setup({ merge })).items.merge(principal, 'i1', { intoItemId: 'i2' });
    expect(merge).toHaveBeenCalledWith(principal, 'i1', 'i2');
  });

  it('submits an item to a venue', async () => {
    const create = vi.fn().mockResolvedValue({});
    const input = {
      sectionId: 's',
      name: { he: 'x', en: null },
      description: null,
      listPrice: null,
      tagIds: [],
      variations: [],
    };
    await (await setup({ create })).venueItems.create(principal, 'v1', input);
    expect(create).toHaveBeenCalledWith(principal, 'v1', input);
  });
});

describe('Item photo controllers', () => {
  const principal: Principal = {
    accountId: 'o1',
    isAdmin: false,
    language: 'he',
    ownedVenueIds: [],
  };

  async function* body(...chunks: Buffer[]): AsyncIterable<Buffer> {
    for (const chunk of chunks) {
      yield await Promise.resolve(chunk);
    }
  }

  async function setup(photos: Partial<Record<keyof ItemPhotoService, unknown>>) {
    const moduleRef = await Test.createTestingModule({
      controllers: [ItemPhotoController, ItemPhotoReadController],
      providers: [{ provide: ItemPhotoService, useValue: photos }],
    }).compile();
    return {
      upload: moduleRef.get(ItemPhotoController),
      read: moduleRef.get(ItemPhotoReadController),
    };
  }

  it('sets the photo from the whole request body, and removes it', async () => {
    const set = vi.fn().mockResolvedValue({});
    const remove = vi.fn().mockResolvedValue({});
    const { upload } = await setup({ set, remove });
    await upload.set(principal, 'i1', body(Buffer.from([1, 2]), Buffer.from([3])));
    expect(set).toHaveBeenCalledWith(principal, 'i1', Buffer.from([1, 2, 3]));
    await upload.remove(principal, 'i1');
    expect(remove).toHaveBeenCalledWith(principal, 'i1');
  });

  it('serves a photo for anyone to cache', async () => {
    const bytes = Buffer.from([0xff, 0xd8, 0xff]);
    const { read } = await setup({
      read: vi.fn().mockResolvedValue({ bytes, type: 'image/jpeg' }),
    });
    const setHeader = vi.fn();
    const file = await read.read('abcdefghijklmnopqrstuv', { setHeader });
    expect(file.getHeaders()).toMatchObject({ type: 'image/jpeg', length: 3 });
    expect(setHeader).toHaveBeenCalledWith('Cache-Control', 'public, max-age=31536000, immutable');
    expect(setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  });
});
