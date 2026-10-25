import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  type ItemRecord,
  ItemRepository,
  MenuSectionRepository,
  UnknownTagError,
  VenueRepository,
} from '@menu/api/menus/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { ITEM_MERGE_LISTENER } from '@menu/api/shared/util-ports';
import { ItemService } from './item.service';

describe('ItemService', () => {
  const venueId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
  const sectionId = '7b1d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';
  const user: Principal = { accountId: 'u', isAdmin: false, language: 'he', ownedVenueIds: [] };
  const other: Principal = { ...user, accountId: 'o' };
  const owner: Principal = { ...user, accountId: 'w', ownedVenueIds: [venueId] };
  const admin: Principal = { ...user, accountId: 'a', isAdmin: true };
  const venue = { id: venueId, status: 'active' };

  function record(overrides: Partial<ItemRecord> = {}): ItemRecord {
    return {
      id: 'i1',
      venueId,
      sectionId,
      name: { he: 'המבורגר', en: null },
      description: null,
      listPrice: { value: 68, currency: 'ILS' as const },
      tagIds: [],
      state: 'approved',
      mergedIntoId: null,
      submittedById: null,
      position: 0,
      createdAt: '2026-10-23T10:00:00.000Z',
      ...overrides,
    };
  }

  async function setup(
    repository: Partial<Record<keyof ItemRepository, unknown>>,
    options: { venue?: unknown; listener?: unknown; section?: boolean } = {},
  ): Promise<ItemService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ItemService,
        { provide: ItemRepository, useValue: repository },
        {
          provide: VenueRepository,
          useValue: {
            findById: vi
              .fn()
              .mockResolvedValue(options.venue === undefined ? venue : options.venue),
          },
        },
        {
          provide: MenuSectionRepository,
          useValue: { belongsTo: vi.fn().mockResolvedValue(options.section ?? true) },
        },
        {
          provide: ITEM_MERGE_LISTENER,
          useValue: options.listener ?? { onItemMerged: vi.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();
    return moduleRef.get(ItemService);
  }

  describe('listing a venue’s items', () => {
    it('shows users approved items and their own submissions', async () => {
      const listByVenue = vi
        .fn()
        .mockResolvedValue([record({ submittedById: 'u', state: 'pending' })]);
      const items = await (await setup({ listByVenue })).listByVenue(user, venueId);
      expect(listByVenue).toHaveBeenCalledWith(venueId, ['approved'], 'u');
      expect(items[0]).toMatchObject({ submittedByMe: true });
      expect(items[0]).not.toHaveProperty('submittedById');
    });

    it('shows approvers pending items too', async () => {
      const listByVenue = vi.fn().mockResolvedValue([]);
      await (await setup({ listByVenue })).listByVenue(owner, venueId);
      expect(listByVenue).toHaveBeenCalledWith(venueId, ['approved', 'pending'], 'w');
    });

    it('fails with 404 for a hidden venue', async () => {
      const service = await setup(
        { listByVenue: vi.fn() },
        { venue: { ...venue, status: 'hidden' } },
      );
      await expect(service.listByVenue(null, venueId)).rejects.toThrow(NotFoundException);
    });
  });

  it('lists every venue’s pending items for an Admin and owned venues for an Owner', async () => {
    const listPending = vi.fn().mockResolvedValue([]);
    const service = await setup({ listPending });
    await service.listPending(admin);
    await service.listPending(owner);
    expect(listPending.mock.calls).toEqual([[null], [[venueId]]]);
  });

  describe('getting an item', () => {
    it('fails with 404 for an item of a hidden venue', async () => {
      const findById = vi.fn().mockResolvedValue(record());
      const service = await setup({ findById }, { venue: { ...venue, status: 'hidden' } });
      await expect(service.get(null, 'i1')).rejects.toThrow(NotFoundException);
    });

    it('hides someone else’s pending submission', async () => {
      const findById = vi.fn().mockResolvedValue(record({ state: 'pending', submittedById: 'u' }));
      await expect((await setup({ findById })).get(other, 'i1')).rejects.toThrow(NotFoundException);
    });

    it('fails with 404 for an unknown item', async () => {
      const findById = vi.fn().mockResolvedValue(null);
      await expect((await setup({ findById })).get(null, 'i1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('creating an item', () => {
    const input = {
      sectionId,
      name: { he: 'צ׳יפס', en: null },
      description: null,
      listPrice: null,
      tagIds: [],
    };

    it('adds an Owner’s item to the menu at once', async () => {
      const create = vi.fn().mockResolvedValue(record());
      await (await setup({ create })).create(owner, venueId, input);
      expect(create.mock.calls[0]?.[0]).toMatchObject({ state: 'approved', submittedById: null });
    });

    it('keeps a user’s submission pending and remembers who sent it', async () => {
      const create = vi.fn().mockResolvedValue(record({ state: 'pending', submittedById: 'u' }));
      const item = await (await setup({ create })).create(user, venueId, input);
      expect(create.mock.calls[0]?.[0]).toMatchObject({ state: 'pending', submittedById: 'u' });
      expect(item).toMatchObject({ state: 'pending', submittedByMe: true });
    });

    it('rejects a section from another venue', async () => {
      const service = await setup({ create: vi.fn() }, { section: false });
      await expect(service.create(owner, venueId, input)).rejects.toThrow(BadRequestException);
    });

    it('rejects an unknown tag', async () => {
      const service = await setup({ create: vi.fn().mockRejectedValue(new UnknownTagError()) });
      await expect(service.create(owner, venueId, { ...input, tagIds: ['t'] })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('editing an item', () => {
    it('lets the Owner edit', async () => {
      const update = vi
        .fn()
        .mockResolvedValue(record({ listPrice: { value: 72, currency: 'ILS' as const } }));
      const service = await setup({ findById: vi.fn().mockResolvedValue(record()), update });
      await expect(
        service.update(owner, 'i1', { listPrice: { value: 72, currency: 'ILS' as const } }),
      ).resolves.toMatchObject({
        listPrice: { value: 72, currency: 'ILS' as const },
      });
    });

    it('fails with 404 when the item disappeared meanwhile', async () => {
      const service = await setup({
        findById: vi.fn().mockResolvedValue(record()),
        update: vi.fn().mockResolvedValue(null),
      });
      await expect(
        service.update(owner, 'i1', { listPrice: { value: 0.01, currency: 'ILS' as const } }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects an unknown tag', async () => {
      const service = await setup({
        findById: vi.fn().mockResolvedValue(record()),
        update: vi.fn().mockRejectedValue(new UnknownTagError()),
      });
      await expect(service.update(owner, 'i1', { tagIds: ['t'] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuses to edit a rejected item', async () => {
      const service = await setup({
        findById: vi.fn().mockResolvedValue(record({ state: 'rejected', submittedById: 'u' })),
        update: vi.fn(),
      });
      await expect(
        service.update(owner, 'i1', { listPrice: { value: 0.01, currency: 'ILS' as const } }),
      ).rejects.toThrow(ConflictException);
    });

    it('forbids a user', async () => {
      const service = await setup({
        findById: vi.fn().mockResolvedValue(record()),
        update: vi.fn(),
      });
      await expect(
        service.update(user, 'i1', { listPrice: { value: 0.01, currency: 'ILS' as const } }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deciding on a submission', () => {
    const pending = record({ state: 'pending', submittedById: 'u' });

    it('approves a pending item and hides its submitter from the approver', async () => {
      const transition = vi.fn().mockResolvedValue({ ...pending, state: 'approved' });
      const service = await setup({ findById: vi.fn().mockResolvedValue(pending), transition });
      const item = await service.decide(owner, 'i1', 'approve');
      expect(transition).toHaveBeenCalledWith('i1', 'pending', 'approved', null);
      expect(item).toMatchObject({ state: 'approved', submittedByMe: false });
    });

    it('archives an approved item', async () => {
      const transition = vi.fn().mockResolvedValue(record({ state: 'archived' }));
      const service = await setup({ findById: vi.fn().mockResolvedValue(record()), transition });
      await service.decide(admin, 'i1', 'archive');
      expect(transition).toHaveBeenCalledWith('i1', 'approved', 'archived', null);
    });

    it('forbids a submitter who is not an approver from approving', async () => {
      const service = await setup({
        findById: vi.fn().mockResolvedValue(pending),
        transition: vi.fn(),
      });
      await expect(service.decide(user, 'i1', 'approve')).rejects.toThrow(ForbiddenException);
    });

    it('fails with 409 when another approver decided first', async () => {
      const service = await setup({
        findById: vi.fn().mockResolvedValue(pending),
        transition: vi.fn().mockResolvedValue(null),
      });
      await expect(service.decide(owner, 'i1', 'reject')).rejects.toThrow(ConflictException);
    });
  });

  describe('merging a submission', () => {
    const pending = record({ id: 'i1', state: 'pending', submittedById: 'u' });
    const target = record({ id: 'i2' });
    const findById = (): unknown =>
      vi.fn((id: string) => Promise.resolve(id === 'i1' ? pending : id === 'i2' ? target : null));

    it('merges into an approved item and lets entries follow', async () => {
      const onItemMerged = vi.fn().mockResolvedValue(undefined);
      const transition = vi
        .fn()
        .mockResolvedValue({ ...pending, state: 'merged', mergedIntoId: 'i2' });
      const service = await setup(
        { findById: findById(), transition },
        { listener: { onItemMerged } },
      );
      await service.merge(owner, 'i1', 'i2');
      expect(transition).toHaveBeenCalledWith('i1', 'pending', 'merged', 'i2');
      expect(onItemMerged).toHaveBeenCalledWith('i1', 'i2');
    });

    it('reports a listener failure, and the same request again completes the merge', async () => {
      const onItemMerged = vi
        .fn()
        .mockRejectedValueOnce(new Error('db down'))
        .mockResolvedValue(undefined);
      const merged = { ...pending, state: 'merged' as const, mergedIntoId: 'i2' };
      const lookup = vi.fn().mockResolvedValueOnce(pending).mockResolvedValueOnce(target);
      const transition = vi.fn().mockResolvedValue(merged);
      const service = await setup({ findById: lookup, transition }, { listener: { onItemMerged } });
      await expect(service.merge(owner, 'i1', 'i2')).rejects.toThrow('db down');
      lookup.mockResolvedValueOnce(merged);
      await expect(service.merge(owner, 'i1', 'i2')).resolves.toMatchObject({ state: 'merged' });
      expect(onItemMerged).toHaveBeenCalledTimes(2);
      expect(transition).toHaveBeenCalledTimes(1);
    });

    it('rejects a target from another venue', async () => {
      const elsewhere = record({ id: 'i2', venueId: '7b1d3c4e-3333-4c1c-9a57-6f7a5d3c2b10' });
      const service = await setup({
        findById: vi.fn((id: string) => Promise.resolve(id === 'i1' ? pending : elsewhere)),
        transition: vi.fn(),
      });
      await expect(service.merge(admin, 'i1', 'i2')).rejects.toThrow(BadRequestException);
    });

    it('rejects merging an item into itself', async () => {
      const service = await setup({ findById: findById() });
      await expect(service.merge(owner, 'i1', 'i1')).rejects.toThrow(BadRequestException);
    });
  });
});
