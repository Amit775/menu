import { type EntryFact } from '@menu/api/entries/data-access';
import { type ItemEntryStats, type RatingTotal } from '@menu/api/shared/util-ports';
import { photoUrl, SCORE_FLOOR } from '@menu/shared/contracts';

function newer(a: EntryFact, b: EntryFact): boolean {
  const byEaten = a.eatenAt.getTime() - b.eatenAt.getTime();
  return byEaten !== 0 ? byEaten > 0 : a.createdAt.getTime() > b.createdAt.getTime();
}

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

function ratingTotal(facts: readonly EntryFact[]): RatingTotal {
  return {
    ratingCount: facts.length,
    ratingSum: facts.reduce((sum, fact) => sum + (fact.rating ?? 0), 0),
  };
}

/**
 * The variations split the item's counted ratings, so the floor holds across
 * all of them at once: with one or two non-public ratings in any variation, every
 * variation uses public ratings alone, or the item's total minus the others would
 * reveal them.
 */
function variationRatings(rated: readonly EntryFact[]): Map<string, RatingTotal> {
  const groups = new Map<string | null, EntryFact[]>();
  for (const fact of rated) {
    groups.set(fact.variationId, [...(groups.get(fact.variationId) ?? []), fact]);
  }
  const safe = [...groups.values()].every((group) => {
    const others = group.filter((fact) => fact.visibility !== 'public').length;
    return others === 0 || others >= SCORE_FLOOR;
  });
  const totals = new Map<string, RatingTotal>();
  for (const [variationId, group] of groups) {
    const counted = safe ? group : group.filter((fact) => fact.visibility === 'public');
    if (variationId !== null && counted.length > 0) {
      totals.set(variationId, ratingTotal(counted));
    }
  }
  return totals;
}

export function summarizeEntries(facts: readonly EntryFact[]): ItemEntryStats {
  const rated = countable(latestPerAuthor(facts, (fact) => fact.rating !== null));
  const answered = countable(latestPerAuthor(facts, (fact) => fact.wouldOrderAgain !== null));
  const yes = answered.filter((fact) => fact.wouldOrderAgain === true).length;
  const publicFacts = facts.filter((fact) => fact.visibility === 'public');
  const others = facts.length - publicFacts.length;
  const newest = (has: (fact: EntryFact) => boolean): EntryFact | null =>
    publicFacts
      .filter(has)
      .reduce<EntryFact | null>((best, fact) => (!best || newer(fact, best) ? fact : best), null);
  const latestPriced = newest((fact) => fact.pricePaid !== null);
  const latestPhotoId = newest((fact) => fact.photoId !== null)?.photoId ?? null;
  return {
    ...ratingTotal(rated),
    variationRatings: variationRatings(rated),
    wouldOrderAgainPercent:
      answered.length >= SCORE_FLOOR ? Math.round((100 * yes) / answered.length) : null,
    publicEntryCount: publicFacts.length,
    otherEntryCount: others >= SCORE_FLOOR ? others : null,
    latestPublicPrice: latestPriced?.pricePaid ?? null,
    latestPublicPhotoUrl: latestPhotoId ? photoUrl(latestPhotoId) : null,
  };
}

export function summarizeByItem(facts: readonly EntryFact[]): Map<string, ItemEntryStats> {
  const byItem = new Map<string, EntryFact[]>();
  for (const fact of facts) {
    byItem.set(fact.itemId, [...(byItem.get(fact.itemId) ?? []), fact]);
  }
  return new Map(
    [...byItem.entries()].map(([itemId, itemFacts]) => [itemId, summarizeEntries(itemFacts)]),
  );
}
