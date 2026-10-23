import { SCORE_FLOOR } from '@menu/shared/contracts';
import { type ItemEntryStats as ItemStats } from '@menu/api/shared/util-ports';

/** An item nobody has written about. */
export const EMPTY_STATS: ItemStats = {
  ratingCount: 0,
  ratingSum: 0,
  wouldOrderAgainPercent: null,
  publicEntryCount: 0,
  otherEntryCount: null,
  latestPublicPrice: null,
  priceHistory: [],
};

export { type ItemStats };

/** How a score is computed. v1 below; author reliability (v2) and friends first (v3) plug in here. */
export interface RankingStrategy {
  /** Null when there are not enough ratings to show a score. */
  score(stats: ItemStats, peerMean: number): number | null;
}

/**
 * v1: the item's mean rating pulled toward the mean of its peers (items with the
 * same primary tag), with the pull shrinking as ratings accumulate. One five-star
 * rating cannot outrank forty 4.6 ones.
 */
export class ConfidenceWeightedRanking implements RankingStrategy {
  constructor(private readonly confidence = 5) {}

  score(stats: ItemStats, peerMean: number): number | null {
    if (stats.ratingCount < SCORE_FLOOR) {
      return null;
    }
    const weighted =
      (this.confidence * peerMean + stats.ratingSum) / (this.confidence + stats.ratingCount);
    return Math.round(weighted * 100) / 100;
  }
}

/** With no ratings anywhere among its peers, an item is compared to the middle of the scale. */
export const NEUTRAL_MEAN = 3;

/** Mean rating per primary tag ('' for items without tags), over each item's latest ratings. */
export function peerMeans(
  items: readonly { id: string; tagIds: readonly string[] }[],
  stats: ReadonlyMap<string, ItemStats>,
): Map<string, number> {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const item of items) {
    const itemStats = stats.get(item.id);
    if (itemStats && itemStats.ratingCount > 0) {
      const key = item.tagIds[0] ?? '';
      const total = totals.get(key) ?? { sum: 0, count: 0 };
      totals.set(key, {
        sum: total.sum + itemStats.ratingSum,
        count: total.count + itemStats.ratingCount,
      });
    }
  }
  return new Map([...totals.entries()].map(([key, total]) => [key, total.sum / total.count]));
}
