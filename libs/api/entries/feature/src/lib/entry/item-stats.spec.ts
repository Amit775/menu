import { type EntryFact } from '@menu/api/entries/data-access';
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
      photoId: null,
      eatenAt: new Date('2026-10-10T12:00:00.000Z'),
      createdAt: new Date('2026-10-10T12:00:00.000Z'),
      ...overrides,
    };
  }
  const authors = (n: number, overrides: Partial<EntryFact>): EntryFact[] =>
    Array.from({ length: n }, (_, index) =>
      fact({ authorId: `${overrides.visibility ?? 'p'}${index}`, ...overrides }),
    );

  it('shows the photo of the newest public entry that has one, never a private one', () => {
    const stats = summarizeEntries([
      fact({
        visibility: 'public',
        photoId: 'olderPhotoolderPhoto00',
        eatenAt: new Date('2026-09-01T00:00:00.000Z'),
      }),
      fact({ visibility: 'public', photoId: 'newerPhotonewerPhoto00' }),
      fact({ visibility: 'public', eatenAt: new Date('2026-11-01T00:00:00.000Z') }),
      fact({ photoId: 'privatePhotoprivatePh0', eatenAt: new Date('2026-12-01T00:00:00.000Z') }),
    ]);
    expect(stats.latestPublicPhotoUrl).toBe('/api/photos/newerPhotonewerPhoto00');
    expect(
      summarizeEntries([fact({ photoId: 'privatePhotoprivatePh0' })]).latestPublicPhotoUrl,
    ).toBeNull();
  });

  it('counts only each author’s latest rating', () => {
    const stats = summarizeEntries([
      fact({ rating: 2, visibility: 'public', eatenAt: new Date('2026-09-01T00:00:00.000Z') }),
      fact({ rating: 5, visibility: 'public', eatenAt: new Date('2026-10-01T00:00:00.000Z') }),
      fact({ authorId: 'a2', rating: 4, visibility: 'public' }),
      fact({ authorId: 'a3', visibility: 'public' }),
    ]);
    expect(stats).toMatchObject({ ratingCount: 2, ratingSum: 9 });
  });

  it('counts three private ratings anonymously', () => {
    const stats = summarizeEntries(authors(3, { rating: 4, visibility: 'private' }));
    expect(stats).toMatchObject({
      ratingCount: 3,
      ratingSum: 12,
      publicEntryCount: 0,
      otherEntryCount: 3,
    });
  });

  it('leaves out one or two private ratings, so public ones cannot reveal them', () => {
    const stats = summarizeEntries([
      ...authors(2, { rating: 5, visibility: 'public' }),
      fact({ authorId: 'secret', rating: 1, visibility: 'shared' }),
    ]);
    expect(stats).toMatchObject({ ratingCount: 2, ratingSum: 10, otherEntryCount: null });
  });

  it('does not reveal a private would-order-again answer', () => {
    const stats = summarizeEntries([
      ...authors(2, { wouldOrderAgain: true, visibility: 'public' }),
      fact({ authorId: 'secret', wouldOrderAgain: false }),
    ]);
    expect(stats.wouldOrderAgainPercent).toBeNull();
  });

  it('shows the ratio from three counted answers', () => {
    const stats = summarizeEntries([
      ...authors(2, { wouldOrderAgain: true, visibility: 'public' }),
      fact({ authorId: 'x', wouldOrderAgain: false, visibility: 'public' }),
    ]);
    expect(stats.wouldOrderAgainPercent).toBe(67);
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

  it('keeps a private price out of a month it could be recovered from', () => {
    const stats = summarizeEntries([
      ...authors(3, { pricePaid: 6000, visibility: 'public' }),
      fact({ authorId: 'secret', pricePaid: 9000 }),
    ]);
    expect(stats.priceHistory).toEqual([{ month: '2026-10', averagePrice: 6000, count: 3 }]);
  });

  it('puts an entry from just after midnight in Israel into the new month', () => {
    const stats = summarizeEntries(
      authors(3, {
        pricePaid: 5000,
        visibility: 'public',
        eatenAt: new Date('2026-09-30T22:30:00.000Z'),
      }),
    );
    expect(stats.priceHistory[0]?.month).toBe('2026-10');
  });

  it('groups facts per item', () => {
    const stats = summarizeByItem([
      fact({ rating: 3, visibility: 'public' }),
      fact({ itemId: 'i2', rating: 5, visibility: 'public' }),
    ]);
    expect(stats.get('i2')).toMatchObject({ ratingCount: 1, ratingSum: 5 });
  });
});
