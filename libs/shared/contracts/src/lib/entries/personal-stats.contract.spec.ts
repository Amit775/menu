import { PersonalStatsSchema } from './personal-stats.contract';

describe('PersonalStatsSchema', () => {
  const stats = {
    entryCount: 12,
    venueCount: 4,
    itemCount: 9,
    averageRating: 4.2,
    months: [
      { month: '2026-09', entryCount: 3, spent: [] },
      { month: '2026-10', entryCount: 5, spent: [{ value: 182.5, currency: 'ILS' }] },
    ],
    topTags: [{ name: { he: 'טבעוני', en: 'Vegan' }, count: 4 }],
    mostOrdered: {
      item: {
        id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
        name: { he: 'פיצה', en: null },
        listPrice: null,
        venue: { id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10', name: { he: 'מוזס', en: null } },
        variations: [],
      },
      count: 3,
    },
  };

  it('accepts a diarist’s stats', () => {
    expect(PersonalStatsSchema.parse(stats)).toEqual(stats);
  });

  it('accepts a new diarist with nothing logged', () => {
    expect(
      PersonalStatsSchema.safeParse({
        ...stats,
        entryCount: 0,
        venueCount: 0,
        itemCount: 0,
        averageRating: null,
        months: [],
        topTags: [],
        mostOrdered: null,
      }).success,
    ).toBe(true);
  });

  it('rejects a month that is not one', () => {
    expect(
      PersonalStatsSchema.safeParse({
        ...stats,
        months: [{ month: '2026-13', entryCount: 1, spent: [] }],
      }).success,
    ).toBe(false);
  });

  it('rejects an average rating outside the scale', () => {
    expect(PersonalStatsSchema.safeParse({ ...stats, averageRating: 6 }).success).toBe(false);
  });
});
