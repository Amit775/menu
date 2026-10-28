import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type CatalogItem, DiscoverRepository } from '@menu/api/discover/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { ENTRY_STATS } from '@menu/api/shared/util-ports';
import { FeedQuerySchema, type ItemVariation, MapQuerySchema } from '@menu/shared/contracts';
import { DiscoverService, RANKING_STRATEGY } from './discover.service';
import { ConfidenceWeightedRanking, EMPTY_STATS, type ItemStats } from './ranking';

describe('DiscoverService', () => {
  const venueId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
  const farVenueId = '7b1d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';
  const burger = '3a2d3c4e-3333-4c1c-9a57-6f7a5d3c2b10';
  const me: Principal = {
    accountId: 'me',
    isAdmin: false,
    isContributor: false,
    language: 'he',
    ownedVenueIds: [],
  };
  const owner: Principal = { ...me, accountId: 'owner', ownedVenueIds: [venueId] };
  const here = { lat: 32.0779, lng: 34.7741 };
  const vegan = '3a2d3c4e-5555-4c1c-9a57-6f7a5d3c2b10';
  const spicy = '3a2d3c4e-6666-4c1c-9a57-6f7a5d3c2b10';

  function variation(id: string, overrides: Partial<ItemVariation> = {}): ItemVariation {
    return {
      id,
      name: { he: id, en: null },
      price: null,
      tagIds: [],
      available: true,
      ...overrides,
    };
  }

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
      variations: [],
      listPrice: null,
      photoUrl: null,
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
    itemStats: ReadonlyMap<string, ItemStats> = stats,
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
      listRevisions: vi.fn().mockResolvedValue([]),
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
            statsByItem: vi.fn().mockResolvedValue(itemStats),
            itemIdsWrittenBy: vi.fn().mockResolvedValue(new Set(['new'])),
            itemIdsSavedBy: vi.fn().mockResolvedValue(['far', 'archived', 'ranked']),
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
        savedByMe: false,
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

    it('finds an item by the tags of a variation it offers now', async () => {
      const service = await setup({
        loadCatalog: vi.fn().mockResolvedValue([
          item('offered', { variations: [variation(vegan, { tagIds: [vegan] })] }),
          item('gone', { variations: [variation(vegan, { tagIds: [vegan], available: false })] }),
          item('split', {
            variations: [
              variation(vegan, { tagIds: [vegan] }),
              variation(spicy, { tagIds: [spicy] }),
            ],
          }),
        ]),
      });
      const tagged = (tagIds: string) =>
        service.feed(null, FeedQuerySchema.parse({ tagIds })).then((feed) => feed.items);
      expect((await tagged(vegan)).map((i) => i.id)).toEqual(['offered', 'split']);
      expect((await tagged(`${burger},${vegan}`)).map((i) => i.id)).toEqual(['offered', 'split']);
      expect(await tagged(`${vegan},${spicy}`)).toEqual([]);
      expect((await tagged(vegan))[0]?.tagIds).toEqual([burger]);
    });

    it('shows a diner’s public photo first, else the item’s own photo', async () => {
      const own = '/api/item-photos/abcdefghijklmnopqrstuv';
      const diner = '/api/photos/abcdefghijklmnopqrstuw';
      const service = await setup(
        {
          loadCatalog: vi
            .fn()
            .mockResolvedValue([item('owned', { photoUrl: own }), item('both', { photoUrl: own })]),
        },
        new Map([['both', { ...EMPTY_STATS, latestPublicPhotoUrl: diner }]]),
      );
      const feed = await service.feed(null, FeedQuerySchema.parse({}));
      expect(Object.fromEntries(feed.items.map((i) => [i.id, i.photoUrl]))).toEqual({
        owned: own,
        both: diner,
      });
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

  describe('the Want to try list', () => {
    it('lists the caller’s saved items newest first, leaving out ones off the menu', async () => {
      const saved = await (await setup()).saved(me, here);
      expect(saved.map((i) => i.id)).toEqual(['far', 'ranked']);
      expect(saved.every((i) => i.savedByMe)).toBe(true);
      expect(saved[1]?.distanceMeters).toBe(0);
    });

    it('flags saved items in the feed', async () => {
      const feed = await (await setup()).feed(me, FeedQuerySchema.parse({}));
      expect(feed.items.find((i) => i.id === 'ranked')?.savedByMe).toBe(true);
      expect(feed.items.find((i) => i.id === 'new')?.savedByMe).toBe(false);
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
      expect(page).toMatchObject({
        archived: true,
        lastConfirmedAt: null,
        tags: [{ slug: 'hamburger' }],
      });
      expect(page.alsoGoodHere.map((i) => i.id)).toEqual(['ranked']);
    });

    it('shows the item’s history from its revisions, on its venue’s sections', async () => {
      const listRevisions = vi.fn().mockResolvedValue([
        {
          kind: 'created',
          snapshot: {
            name: { he: 'ranked', en: null },
            description: null,
            listPrice: { value: 58, currency: 'ILS' },
            sectionId: 's1',
            tagIds: [],
          },
          changedAt: '2026-10-01T00:00:00.000Z',
        },
      ]);
      const listSections = vi.fn().mockResolvedValue([]);
      const page = await (
        await setup({ listRevisions, listSections })
      ).itemPage(null, 'ranked', {});
      expect(listRevisions).toHaveBeenCalledWith('ranked');
      expect(listSections).toHaveBeenCalledWith(venueId);
      expect(page.lastConfirmedAt).toBe('2026-10-01T00:00:00.000Z');
      expect(page.history).toEqual([
        {
          kind: 'added',
          at: '2026-10-01T00:00:00.000Z',
          listPrice: { value: 58, currency: 'ILS' },
        },
      ]);
    });

    it('scores each variation it has, offered or not, with its tags', async () => {
      const veganTag = { id: vegan, slug: 'vegan', name: { he: 'טבעוני', en: null }, kind: 'diet' };
      const ranked: ItemStats = {
        ...EMPTY_STATS,
        ratingCount: 4,
        ratingSum: 17,
        variationRatings: new Map([
          [vegan, { ratingCount: 3, ratingSum: 15 }],
          [spicy, { ratingCount: 1, ratingSum: 2 }],
        ]),
      };
      const service = await setup(
        {
          loadCatalog: vi.fn().mockResolvedValue([
            item('ranked', {
              variations: [
                variation(vegan, { tagIds: [vegan], price: { value: 62, currency: 'ILS' } }),
                variation(spicy, { available: false }),
              ],
            }),
          ]),
          listTags: vi.fn().mockResolvedValue([veganTag]),
        },
        new Map([['ranked', ranked]]),
      );
      const page = await service.itemPage(null, 'ranked', {});
      expect(page.variations).toEqual([
        {
          variation: {
            id: vegan,
            name: { he: vegan, en: null },
            price: { value: 62, currency: 'ILS' },
            available: true,
          },
          tags: [veganTag],
          score: expect.any(Number) as unknown,
          ratingCount: 3,
        },
        {
          variation: { id: spicy, name: { he: spicy, en: null }, price: null, available: false },
          tags: [],
          score: null,
          ratingCount: 1,
        },
      ]);
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
