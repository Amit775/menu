import { type EntryFact } from '@menu/api/discover/data-access';
import { type PricePoint, SCORE_FLOOR } from '@menu/shared/contracts';

/** Everything discovery shows about one item's entries, before ranking. */
export interface ItemStats {
  /** Authors with a rating; each counts once, with their latest rating. */
  ratingCount: number;
  ratingSum: number;
  /** Null under the floor. */
  wouldOrderAgainPercent: number | null;
  publicEntryCount: number;
  otherEntryCount: number;
  latestPublicPrice: number | null;
  priceHistory: PricePoint[];
}

export const EMPTY_STATS: ItemStats = {
  ratingCount: 0,
  ratingSum: 0,
  wouldOrderAgainPercent: null,
  publicEntryCount: 0,
  otherEntryCount: 0,
  latestPublicPrice: null,
  priceHistory: [],
};

function newer(a: EntryFact, b: EntryFact): boolean {
  const byEaten = a.eatenAt.getTime() - b.eatenAt.getTime();
  return byEaten !== 0 ? byEaten > 0 : a.createdAt.getTime() > b.createdAt.getTime();
}

/** The latest fact per author among those `has` accepts. */
function latestPerAuthor(
  facts: readonly EntryFact[],
  has: (fact: EntryFact) => boolean,
): EntryFact[] {
  const latest = new Map<string, EntryFact>();
  for (const fact of facts) {
    const current = latest.get(fact.authorId);
    if (has(fact) && (!current || newer(fact, current))) {
      latest.set(fact.authorId, fact);
    }
  }
  return [...latest.values()];
}

function priceHistory(facts: readonly EntryFact[]): PricePoint[] {
  const months = new Map<string, number[]>();
  for (const fact of facts) {
    if (fact.pricePaid !== null) {
      const month = fact.eatenAt.toISOString().slice(0, 7);
      months.set(month, [...(months.get(month) ?? []), fact.pricePaid]);
    }
  }
  return [...months.entries()]
    .filter(([, prices]) => prices.length >= SCORE_FLOOR)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, prices]) => ({
      month,
      averagePrice: Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length),
      count: prices.length,
    }));
}

/**
 * Sums one item's entries. Private and shared entries count toward the score,
 * the ratio and the price history anonymously; only public ones give a latest price.
 */
export function summarizeEntries(facts: readonly EntryFact[]): ItemStats {
  const rated = latestPerAuthor(facts, (fact) => fact.rating !== null);
  const answered = latestPerAuthor(facts, (fact) => fact.wouldOrderAgain !== null);
  const yes = answered.filter((fact) => fact.wouldOrderAgain === true).length;
  const publicFacts = facts.filter((fact) => fact.visibility === 'public');
  const latestPriced = publicFacts
    .filter((fact) => fact.pricePaid !== null)
    .reduce<EntryFact | null>((best, fact) => (!best || newer(fact, best) ? fact : best), null);
  return {
    ratingCount: rated.length,
    ratingSum: rated.reduce((sum, fact) => sum + (fact.rating ?? 0), 0),
    wouldOrderAgainPercent:
      answered.length >= SCORE_FLOOR ? Math.round((100 * yes) / answered.length) : null,
    publicEntryCount: publicFacts.length,
    otherEntryCount: facts.length - publicFacts.length,
    latestPublicPrice: latestPriced?.pricePaid ?? null,
    priceHistory: priceHistory(facts),
  };
}

/** Groups facts by item and summarizes each. */
export function summarizeByItem(facts: readonly EntryFact[]): Map<string, ItemStats> {
  const byItem = new Map<string, EntryFact[]>();
  for (const fact of facts) {
    byItem.set(fact.itemId, [...(byItem.get(fact.itemId) ?? []), fact]);
  }
  return new Map(
    [...byItem.entries()].map(([itemId, itemFacts]) => [itemId, summarizeEntries(itemFacts)]),
  );
}
