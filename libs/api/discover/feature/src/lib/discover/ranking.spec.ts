import { EMPTY_STATS, type ItemStats } from './item-stats';
import { ConfidenceWeightedRanking, peerMeans } from './ranking';

describe('ConfidenceWeightedRanking', () => {
  const ranking = new ConfidenceWeightedRanking();
  const stats = (ratingCount: number, mean: number): ItemStats => ({
    ...EMPTY_STATS,
    ratingCount,
    ratingSum: ratingCount * mean,
  });

  it('shows no score under three ratings', () => {
    expect(ranking.score(stats(2, 5), 4)).toBeNull();
  });

  it('ranks forty 4.6 ratings above three fives', () => {
    const many = ranking.score(stats(40, 4.6), 4) ?? 0;
    const few = ranking.score(stats(3, 5), 4) ?? 0;
    expect(many).toBeGreaterThan(few);
  });

  it('pulls a small sample toward its peers', () => {
    expect(ranking.score(stats(3, 5), 3)).toBe(3.75);
  });
});

describe('peerMeans', () => {
  it('averages latest ratings per primary tag', () => {
    const items = [
      { id: 'i1', tagIds: ['burger', 'vegan'] },
      { id: 'i2', tagIds: ['burger'] },
      { id: 'i3', tagIds: [] },
    ];
    const stats = new Map<string, ItemStats>([
      ['i1', { ...EMPTY_STATS, ratingCount: 2, ratingSum: 10 }],
      ['i2', { ...EMPTY_STATS, ratingCount: 2, ratingSum: 6 }],
      ['i3', { ...EMPTY_STATS, ratingCount: 1, ratingSum: 2 }],
    ]);
    expect(peerMeans(items, stats)).toEqual(
      new Map([
        ['burger', 4],
        ['', 2],
      ]),
    );
  });
});
