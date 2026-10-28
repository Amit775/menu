import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  type ItemRecord,
  ItemReportRepository,
  ItemRepository,
  VenueRepository,
} from '@menu/api/menus/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { ItemReportService } from './item-report.service';

describe('ItemReportService', () => {
  const diner: Principal = {
    accountId: 'd1',
    isAdmin: false,
    isContributor: false,
    language: 'he',
    ownedVenueIds: [],
  };
  const owner: Principal = { ...diner, accountId: 'o1', ownedVenueIds: ['v1'] };
  const contributor: Principal = { ...diner, accountId: 'c1', isContributor: true };

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

  async function setup(
    item: ItemRecord | null = record(),
    reports: Partial<Record<keyof ItemReportRepository, unknown>> = {},
    venue: { id: string; status: string } | null = { id: 'v1', status: 'active' },
    confirm = vi.fn().mockResolvedValue(true),
  ) {
    const repository = { findById: vi.fn().mockResolvedValue(item), confirm };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ItemReportService,
        { provide: ItemReportRepository, useValue: reports },
        { provide: ItemRepository, useValue: repository },
        { provide: VenueRepository, useValue: { findById: vi.fn().mockResolvedValue(venue) } },
      ],
    }).compile();
    return moduleRef.get(ItemReportService);
  }

  describe('reporting', () => {
    it('files the diner’s report on an item on the menu', async () => {
      const report = vi.fn().mockResolvedValue(true);
      await (
        await setup(record(), { report })
      ).report(diner, 'i1', {
        kind: 'price',
        price: { value: 74, currency: 'ILS' },
      });
      expect(report).toHaveBeenCalledWith({
        itemId: 'i1',
        reporterId: 'd1',
        kind: 'price',
        price: { value: 74, currency: 'ILS' },
      });
    });

    it('files a report that the item is gone with no price', async () => {
      const report = vi.fn().mockResolvedValue(true);
      await (await setup(record(), { report })).report(diner, 'i1', { kind: 'gone' });
      expect(report).toHaveBeenCalledWith(expect.objectContaining({ kind: 'gone', price: null }));
    });

    it('refuses an item archived while the report was on its way', async () => {
      const service = await setup(record(), { report: vi.fn().mockResolvedValue(false) });
      await expect(service.report(diner, 'i1', { kind: 'gone' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('refuses an item that is no longer on the menu', async () => {
      const service = await setup(record({ state: 'archived' }), { report: vi.fn() });
      await expect(service.report(diner, 'i1', { kind: 'gone' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('hides unknown items, pending ones and the items of a hidden venue', async () => {
      const report = vi.fn();
      await expect(
        (await setup(null, { report })).report(diner, 'i1', { kind: 'gone' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        (await setup(record({ state: 'pending', submittedById: 'x' }), { report })).report(
          diner,
          'i1',
          { kind: 'gone' },
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        (await setup(record(), { report }, { id: 'v1', status: 'hidden' })).report(diner, 'i1', {
          kind: 'gone',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(report).not.toHaveBeenCalled();
    });
  });

  describe('the venue’s reports', () => {
    it('lists them for the venue’s Owner', async () => {
      const summariesForVenue = vi.fn().mockResolvedValue([]);
      await expect(
        (await setup(record(), { summariesForVenue })).listForVenue(owner, 'v1'),
      ).resolves.toEqual([]);
      expect(summariesForVenue).toHaveBeenCalledWith('v1');
    });

    it('keeps them from everyone else, Contributors included', async () => {
      const summariesForVenue = vi.fn();
      const service = await setup(record(), { summariesForVenue });
      await expect(service.listForVenue(diner, 'v1')).rejects.toThrow(ForbiddenException);
      await expect(service.listForVenue(contributor, 'v1')).rejects.toThrow(ForbiddenException);
      expect(summariesForVenue).not.toHaveBeenCalled();
    });
  });

  describe('confirming an item is still served', () => {
    it('lets the venue’s Owner confirm it', async () => {
      const confirm = vi.fn().mockResolvedValue(true);
      await (await setup(record(), {}, undefined, confirm)).confirm(owner, 'i1');
      expect(confirm).toHaveBeenCalledWith('i1', 'o1');
    });

    it('refuses a diner or a Contributor', async () => {
      const confirm = vi.fn();
      const service = await setup(record(), {}, undefined, confirm);
      await expect(service.confirm(diner, 'i1')).rejects.toThrow(ForbiddenException);
      await expect(service.confirm(contributor, 'i1')).rejects.toThrow(ForbiddenException);
      expect(confirm).not.toHaveBeenCalled();
    });

    it('reports a conflict when the item left the menu meanwhile', async () => {
      const service = await setup(record(), {}, undefined, vi.fn().mockResolvedValue(false));
      await expect(service.confirm(owner, 'i1')).rejects.toThrow(ConflictException);
    });
  });
});
