import { type DiscoverItem, type FeedQuery } from '@menu/shared/contracts';

/** One not-yet-ranked item every this many cards in reels mode, so new dishes get their first ratings. */
export const DISCOVERY_SLOT = 5;

function byDistance(a: DiscoverItem, b: DiscoverItem): number {
  return (a.distanceMeters ?? Infinity) - (b.distanceMeters ?? Infinity);
}

function byScore(a: DiscoverItem, b: DiscoverItem): number {
  return (b.score ?? 0) - (a.score ?? 0) || b.ratingCount - a.ratingCount || byDistance(a, b);
}

/** Unranked items: the caller's own first (home with no data), then the nearest. */
function byFlagThenDistance(a: DiscoverItem, b: DiscoverItem): number {
  return Number(b.writtenByMe) - Number(a.writtenByMe) || byDistance(a, b);
}

function byPrice(a: DiscoverItem, b: DiscoverItem): number {
  return (a.latestPrice ?? Infinity) - (b.latestPrice ?? Infinity) || byDistance(a, b);
}

export function orderFeed(
  items: readonly DiscoverItem[],
  query: Pick<FeedQuery, 'mode' | 'sort'>,
): DiscoverItem[] {
  if (query.sort === 'distance') {
    return [...items].sort(byDistance);
  }
  if (query.sort === 'price') {
    return [...items].sort(byPrice);
  }
  const ranked = items.filter((item) => item.score !== null).sort(byScore);
  const unranked = items.filter((item) => item.score === null).sort(byFlagThenDistance);
  if (query.mode === 'list') {
    return [...ranked, ...unranked];
  }
  const feed: DiscoverItem[] = [];
  while (ranked.length > 0 || unranked.length > 0) {
    const slotIsDiscovery = feed.length % DISCOVERY_SLOT === DISCOVERY_SLOT - 1;
    const next =
      (slotIsDiscovery ? unranked.shift() : ranked.shift()) ?? ranked.shift() ?? unranked.shift();
    if (next) {
      feed.push(next);
    }
  }
  return feed;
}
