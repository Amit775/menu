import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type CatalogItem, DiscoverRepository } from '@menu/api/discover/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { ENTRY_STATS } from '@menu/api/shared/util-ports';
import { FeedQuerySchema, MapQuerySchema } from '@menu/shared/contracts';
import { DiscoverService, RANKING_STRATEGY } from './discover.service';
import { ConfidenceWeightedRanking, EMPTY_STATS, type ItemStats } from './ranking';

describe('DiscoverService', () => {
  const venueId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
  const farVenueId = '7b1d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';
  const burger = '3a2d3c4e-3333-4c1c-9a57-6f7a5d3c2b10';
  const me: Principal = { accountId: 'me', isAdmin: false, language: 'he', ownedVenueIds: [] };
  const owner: Principal = { ...me, accountId: 'owner', ownedVenueIds: [venueId] };
  const here = { lat: 32.0779, lng: 34.7741 };

  function item(id: string, overrides: Partial<CatalogItem> = {}): CatalogItem {
    return {
      id,
      name: { he: id, en: null },
      state: 'approved',
      venueId,
      venueName: { he: 'משה', en: null },
      venueLocation: here,
      sectionId: 's1',
      position: 0,
      tagIds: [burger],
      listPrice: null,
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
      ...overrides,
    };
  }

  const catalog = [
    item('ranked'),
    item('archived', { state: 'archived' }),
    item('far', { venueId: farVenueId, venueLocation: { lat: 32.79, lng: 34.99 } }),
    item('new', { position: 1, listPrice: { value: 42, currency: 'ILS' as const } }),
  ];
  const stats = new Map<string, ItemStats>([
    [
      'ranked',
      {
        ...EMPTY_STATS,
        ratingCount: 3,
        ratingSum: 14,
        wouldOrderAgainPercent: 100,
        publicEntryCount: 1,
        otherEntryCount: null,
      },
    ],
    ['new', { ...EMPTY_STATS, ratingCount: 1, ratingSum: 3, publicEntryCount: 1 }],
  ]);

  async function setup(
    overrides: Partial<Record<keyof DiscoverRepository, unknown>> = {},
  ): Promise<DiscoverService> {
    const repository = {
      loadCatalog: vi.fn().mockResolvedValue(catalog),
      findActiveVenue: vi.fn().mockResolvedValue({ id: venueId, location: here }),
      listActiveVenues: vi
        .fn()
        .mockResolvedValue([{ id: venueId, name: { he: 'הבורגר של משה', en: null } }]),
      listSections: vi
        .fn()
        .mockResolvedValue([{ id: 's1', venueId, name: { he: 'עיקריות', en: null }, position: 0 }]),
      listTags: vi
        .fn()
        .mockResolvedValue([
          { id: burger, slug: 'hamburger', name: { he: 'המבורגר', en: null }, kind: 'dish' },
        ]),
      ...overrides,
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        DiscoverService,
        { provide: DiscoverRepository, useValue: repository },
        { provide: RANKING_STRATEGY, useValue: new ConfidenceWeightedRanking() },
        {
          provide: ENTRY_STATS,
          useValue: {
            statsByItem: vi.fn().mockResolvedValue(stats),
            itemIdsWrittenBy: vi.fn().mockResolvedValue(new Set(['new'])),
            countEntriesAt: vi.fn().mockResolvedValue(2),
          },
        },
      ],
    }).compile();
    return moduleRef.get(DiscoverService);
  }

  describe('the feed', () => {
    it('shows approved items within the radius, scored from the floor up, with the caller’s flag', async () => {
      const feed = await (await setup()).feed(me, FeedQuerySchema.parse({ ...here, mode: 'list' }));
      expect(feed.items.map((i) => i.id)).toEqual(['ranked', 'new']);
      expect(feed.items[0]).toMatchObject({ ratingCount: 3, wouldOrderAgainPercent: 100 });
      expect(feed.items[0]?.score).not.toBeNull();
      expect(feed.items[1]).toMatchObject({
        score: null,
        writtenByMe: true,
        latestPrice: { value: 42, currency: 'ILS' as const },
      });
      expect(feed.nextOffset).toBeNull();
    });

    it('includes far items without a location', async () => {
      const feed = await (await setup()).feed(null, FeedQuerySchema.parse({}));
      expect(feed.items.map((i) => i.id)).toContain('far');
      expect(feed.items.every((i) => !i.writtenByMe && i.distanceMeters === null)).toBe(true);
    });

    it('pages with an offset', async () => {
      const feed = await (await setup()).feed(null, FeedQuerySchema.parse({ limit: '1' }));
      expect(feed).toMatchObject({ nextOffset: 1 });
      expect(feed.items).toHaveLength(1);
    });

    it('filters by a price range on the latest price', async () => {
      const feed = await (await setup()).feed(null, FeedQuerySchema.parse({ maxPrice: '5000' }));
      expect(feed.items.map((i) => i.id)).toEqual(['new']);
    });

    it('filters by tag', async () => {
      const other = '3a2d3c4e-4444-4c1c-9a57-6f7a5d3c2b10';
      const feed = await (await setup()).feed(null, FeedQuerySchema.parse({ tagIds: other }));
      expect(feed.items).toEqual([]);
    });
  });

  it('puts one pin per venue on the map with its best score', async () => {
    const pins = await (await setup()).map(me, MapQuerySchema.parse({}));
    expect(pins).toHaveLength(2);
    expect(pins.find((pin) => pin.venue.id === venueId)).toMatchObject({
      itemCount: 2,
      writtenByMe: true,
    });
  });

  describe('the venue page', () => {
    it('lists the menu by section, the top items and the caller’s entry count', async () => {
      const page = await (await setup()).venuePage(me, venueId, here);
      expect(page.sections[0]?.items.map((i) => i.id)).toEqual(['ranked', 'new']);
      expect(page.topItems.map((i) => i.id)).toEqual(['ranked']);
      expect(page).toMatchObject({ myEntryCount: 2, distanceMeters: 0 });
    });

    it('fails with 404 for a hidden or unknown venue', async () => {
      const service = await setup({ findActiveVenue: vi.fn().mockResolvedValue(null) });
      await expect(service.venuePage(null, venueId, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('the item page', () => {
    it('shows an archived item, marked, with its tags', async () => {
      const page = await (await setup()).itemPage(null, 'archived', {});
      expect(page).toMatchObject({ archived: true, tags: [{ slug: 'hamburger' }] });
      expect(page.alsoGoodHere.map((i) => i.id)).toEqual(['ranked']);
    });

    it('fails with 404 for an item that is not in discovery', async () => {
      await expect((await setup()).itemPage(null, 'pending-one', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  it('finds nothing for a query that folds to nothing', async () => {
    await expect((await setup()).search(null, '״')).resolves.toEqual({
      items: [],
      venues: [],
      tags: [],
    });
  });

  it('finds items, venues and tags by folded Hebrew', async () => {
    const results = await (await setup()).search(null, 'בורגר');
    expect(results.venues).toHaveLength(1);
    expect(results.tags.map((tag) => tag.slug)).toEqual(['hamburger']);
  });

  describe('Owner insights', () => {
    it('passes on counts of entries that are not public as entries gives them', async () => {
      const insights = await (await setup()).insights(owner, venueId);
      expect(insights.items.find((i) => i.itemId === 'ranked')).toMatchObject({
        publicEntryCount: 1,
        otherEntryCount: null,
        ratingCount: 3,
      });
    });

    it('forbids anyone but the venue’s Owner or an Admin', async () => {
      await expect((await setup()).insights(me, venueId)).rejects.toThrow(ForbiddenException);
    });
  });
});
