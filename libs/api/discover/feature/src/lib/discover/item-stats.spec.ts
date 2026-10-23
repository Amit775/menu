import { type EntryFact } from '@menu/api/discover/data-access';
import { summarizeByItem, summarizeEntries } from './item-stats';

describe('summarizeEntries', () => {
  function fact(overrides: Partial<EntryFact>): EntryFact {
    return {
      itemId: 'i1',
      authorId: 'a1',
      rating: null,
      wouldOrderAgain: null,
      pricePaid: null,
      visibility: 'private',
      eatenAt: new Date('2026-10-01T12:00:00.000Z'),
      createdAt: new Date('2026-10-01T12:00:00.000Z'),
      ...overrides,
    };
  }

  it('counts only each author’s latest rating', () => {
    const stats = summarizeEntries([
      fact({ rating: 2, eatenAt: new Date('2026-09-01T00:00:00.000Z') }),
      fact({ rating: 5, eatenAt: new Date('2026-10-01T00:00:00.000Z') }),
      fact({ authorId: 'a2', rating: 4 }),
      fact({ authorId: 'a3' }),
    ]);
    expect(stats).toMatchObject({ ratingCount: 2, ratingSum: 9 });
  });

  it('counts private entries in the score anonymously', () => {
    const stats = summarizeEntries([fact({ rating: 4, visibility: 'private' })]);
    expect(stats).toMatchObject({ ratingCount: 1, publicEntryCount: 0, otherEntryCount: 1 });
  });

  it('shows the would-order-again ratio only from the floor', () => {
    const two = [fact({ wouldOrderAgain: true }), fact({ authorId: 'a2', wouldOrderAgain: false })];
    expect(summarizeEntries(two).wouldOrderAgainPercent).toBeNull();
    const three = [...two, fact({ authorId: 'a3', wouldOrderAgain: true })];
    expect(summarizeEntries(three).wouldOrderAgainPercent).toBe(67);
  });

  it('takes the latest price from public entries only', () => {
    const stats = summarizeEntries([
      fact({
        pricePaid: 6000,
        visibility: 'public',
        eatenAt: new Date('2026-09-01T00:00:00.000Z'),
      }),
      fact({ authorId: 'a2', pricePaid: 7000, visibility: 'private' }),
    ]);
    expect(stats.latestPublicPrice).toBe(6000);
  });

  it('keeps price-history months with at least three prices', () => {
    const october = (authorId: string, pricePaid: number) => fact({ authorId, pricePaid });
    const stats = summarizeEntries([
      october('a1', 6000),
      october('a2', 7000),
      october('a3', 6500),
      fact({ pricePaid: 5000, eatenAt: new Date('2026-09-01T00:00:00.000Z') }),
    ]);
    expect(stats.priceHistory).toEqual([{ month: '2026-10', averagePrice: 6500, count: 3 }]);
  });

  it('groups facts per item', () => {
    const stats = summarizeByItem([fact({ rating: 3 }), fact({ itemId: 'i2', rating: 5 })]);
    expect(stats.get('i2')).toMatchObject({ ratingCount: 1, ratingSum: 5 });
  });
});
