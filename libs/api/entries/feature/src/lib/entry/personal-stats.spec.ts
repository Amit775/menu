import { type EntryRecord } from '@menu/api/entries/data-access';
import { type ItemTag } from '@menu/api/shared/util-ports';
import { type ItemRef } from '@menu/shared/contracts';
import { personalStats } from './personal-stats';

describe('personalStats', () => {
  const now = new Date('2026-10-28T12:00:00.000Z');
  const vegan: ItemTag = { id: 't1', name: { he: 'טבעוני', en: 'Vegan' } };
  const spicy: ItemTag = { id: 't2', name: { he: 'חריף', en: null } };
  const sweet: ItemTag = { id: 't3', name: { he: 'מתוק', en: null } };
  const bitter: ItemTag = { id: 't4', name: { he: 'מר', en: null } };

  function ref(id: string, venueId = 'v1'): ItemRef {
    return {
      id,
      name: { he: id, en: null },
      listPrice: null,
      venue: { id: venueId, name: { he: venueId, en: null } },
      variations: [],
    };
  }

  function entry(overrides: Partial<EntryRecord> = {}): EntryRecord {
    return {
      id: 'e1',
      authorId: 'a1',
      itemId: 'i1',
      variationId: null,
      venueId: 'v1',
      eatenAt: '2026-10-20T19:30:00.000Z',
      rating: null,
      wouldOrderAgain: null,
      pricePaid: null,
      text: '',
      visibility: 'private',
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

  const refs = new Map([
    ['i1', ref('i1')],
    ['i2', ref('i2')],
    ['i3', ref('i3', 'v2')],
  ]);

  it('gives a new diarist empty stats with the last six months', () => {
    expect(personalStats([], refs, new Map(), now)).toEqual({
      entryCount: 0,
      venueCount: 0,
      itemCount: 0,
      averageRating: null,
      months: ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map((month) => ({
        month,
        entryCount: 0,
        spent: [],
      })),
      topTags: [],
      mostOrdered: null,
    });
  });

  it('counts entries, venues and items tried', () => {
    const stats = personalStats(
      [
        entry({ itemId: 'i1' }),
        entry({ itemId: 'i1' }),
        entry({ itemId: 'i2' }),
        entry({ itemId: 'i3', venueId: 'v2' }),
      ],
      refs,
      new Map(),
      now,
    );
    expect(stats).toMatchObject({ entryCount: 4, venueCount: 2, itemCount: 3 });
  });

  it('averages the ratings given, to one decimal, skipping unrated entries', () => {
    const stats = personalStats(
      [entry({ rating: 5 }), entry({ rating: 4 }), entry({ rating: 4 }), entry()],
      refs,
      new Map(),
      now,
    );
    expect(stats.averageRating).toBe(4.3);
  });

  it('places entries in months by Israel time and sums what was paid', () => {
    const stats = personalStats(
      [
        // 31 Aug 22:30 UTC is already 1 September in Israel.
        entry({ eatenAt: '2026-08-31T22:30:00.000Z', pricePaid: { value: 40.1, currency: 'ILS' } }),
        entry({ eatenAt: '2026-09-15T12:00:00.000Z', pricePaid: { value: 20.2, currency: 'ILS' } }),
        entry({ eatenAt: '2026-10-01T12:00:00.000Z' }),
        entry({ eatenAt: '2026-01-01T12:00:00.000Z', pricePaid: { value: 99, currency: 'ILS' } }),
      ],
      refs,
      new Map(),
      now,
    );
    expect(stats.months.slice(-3)).toEqual([
      { month: '2026-08', entryCount: 0, spent: [] },
      { month: '2026-09', entryCount: 2, spent: [{ value: 60.3, currency: 'ILS' }] },
      { month: '2026-10', entryCount: 1, spent: [] },
    ]);
    expect(stats.entryCount).toBe(4);
  });

  it('ranks the three tags logged most, by entries', () => {
    const tags = new Map([
      ['i1', [vegan, spicy]],
      ['i2', [vegan, sweet]],
      ['i3', [bitter, spicy, vegan]],
    ]);
    const stats = personalStats(
      [entry({ itemId: 'i1' }), entry({ itemId: 'i2' }), entry({ itemId: 'i3' })],
      refs,
      tags,
      now,
    );
    expect(stats.topTags).toEqual([
      { name: vegan.name, count: 3 },
      { name: spicy.name, count: 2 },
      { name: bitter.name, count: 1 },
    ]);
  });

  it('names the item ordered most, the latest one on a tie', () => {
    const stats = personalStats(
      [
        entry({ itemId: 'i1', eatenAt: '2026-10-01T12:00:00.000Z' }),
        entry({ itemId: 'i1', eatenAt: '2026-10-02T12:00:00.000Z' }),
        entry({ itemId: 'i2', eatenAt: '2026-10-03T12:00:00.000Z' }),
        entry({ itemId: 'i2', eatenAt: '2026-10-04T12:00:00.000Z' }),
      ],
      refs,
      new Map(),
      now,
    );
    expect(stats.mostOrdered).toEqual({ item: refs.get('i2'), count: 2 });
  });

  it('names no favourite until an item is logged twice', () => {
    const stats = personalStats(
      [entry({ itemId: 'i1' }), entry({ itemId: 'i2' })],
      refs,
      new Map(),
      now,
    );
    expect(stats.mostOrdered).toBeNull();
  });
});
