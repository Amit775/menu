import { type EntryFact } from '@menu/api/entries/data-access';
import { type ItemEntryStats } from '@menu/api/shared/util-ports';
import { type PricePoint, SCORE_FLOOR } from '@menu/shared/contracts';

/** Price-history months follow the diners' calendar, not UTC. */
const monthFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
});

function monthOf(date: Date): string {
  return monthFormat.format(date).slice(0, 7);
}

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

/**
 * The privacy rule behind every number: entries that are not public join an
 * aggregate only when at least `SCORE_FLOOR` of them are in it. With one or two,
 * the aggregate uses public entries alone, so it cannot be differenced against
 * the public entries everyone sees.
 */
export function countable(facts: readonly EntryFact[]): EntryFact[] {
  const others = facts.filter((fact) => fact.visibility !== 'public').length;
  return others >= SCORE_FLOOR ? [...facts] : facts.filter((fact) => fact.visibility === 'public');
}

function priceHistory(facts: readonly EntryFact[]): PricePoint[] {
  const months = new Map<string, EntryFact[]>();
  for (const fact of facts) {
    if (fact.pricePaid !== null) {
      const month = monthOf(fact.eatenAt);
      months.set(month, [...(months.get(month) ?? []), fact]);
    }
  }
  return [...months.entries()]
    .map(([month, monthFacts]) => ({
      month,
      prices: countable(monthFacts).map((fact) => fact.pricePaid ?? 0),
    }))
    .filter(({ prices }) => prices.length >= SCORE_FLOOR)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(({ month, prices }) => ({
      month,
      averagePrice: Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length),
      count: prices.length,
    }));
}

/** Sums one item's unhidden entries under the privacy rule (see `countable`). */
export function summarizeEntries(facts: readonly EntryFact[]): ItemEntryStats {
  const rated = countable(latestPerAuthor(facts, (fact) => fact.rating !== null));
  const answered = countable(latestPerAuthor(facts, (fact) => fact.wouldOrderAgain !== null));
  const yes = answered.filter((fact) => fact.wouldOrderAgain === true).length;
  const publicFacts = facts.filter((fact) => fact.visibility === 'public');
  const others = facts.length - publicFacts.length;
  const latestPriced = publicFacts
    .filter((fact) => fact.pricePaid !== null)
    .reduce<EntryFact | null>((best, fact) => (!best || newer(fact, best) ? fact : best), null);
  return {
    ratingCount: rated.length,
    ratingSum: rated.reduce((sum, fact) => sum + (fact.rating ?? 0), 0),
    wouldOrderAgainPercent:
      answered.length >= SCORE_FLOOR ? Math.round((100 * yes) / answered.length) : null,
    publicEntryCount: publicFacts.length,
    otherEntryCount: others >= SCORE_FLOOR ? others : null,
    latestPublicPrice: latestPriced?.pricePaid ?? null,
    priceHistory: priceHistory(facts),
  };
}

/** Groups facts by item and summarizes each. */
export function summarizeByItem(facts: readonly EntryFact[]): Map<string, ItemEntryStats> {
  const byItem = new Map<string, EntryFact[]>();
  for (const fact of facts) {
    byItem.set(fact.itemId, [...(byItem.get(fact.itemId) ?? []), fact]);
  }
  return new Map(
    [...byItem.entries()].map(([itemId, itemFacts]) => [itemId, summarizeEntries(itemFacts)]),
  );
}
