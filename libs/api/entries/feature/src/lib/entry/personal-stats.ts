import { type EntryRecord } from '@menu/api/entries/data-access';
import { type ItemTag } from '@menu/api/shared/util-ports';
import {
  type Currency,
  type ItemRef,
  type PersonalStats,
  type Price,
  STATS_MONTHS,
} from '@menu/shared/contracts';

const TOP_TAGS = 3;
const FAVOURITE_FLOOR = 2;

const monthFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
});

function monthOf(date: Date): string {
  return monthFormat.format(date).slice(0, 7);
}

function lastMonths(now: Date): string[] {
  const current = monthOf(now);
  const year = Number(current.slice(0, 4));
  const month = Number(current.slice(5, 7));
  return Array.from({ length: STATS_MONTHS }, (_, index) => {
    const date = new Date(Date.UTC(year, month - STATS_MONTHS + index, 1));
    return date.toISOString().slice(0, 7);
  });
}

function countBy<T>(values: readonly T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function totals(prices: readonly Price[]): Price[] {
  const sums = new Map<Currency, number>();
  for (const price of prices) {
    sums.set(price.currency, (sums.get(price.currency) ?? 0) + price.value);
  }
  return [...sums].map(([currency, value]) => ({ value: Math.round(value * 100) / 100, currency }));
}

function averageRating(entries: readonly EntryRecord[]): number | null {
  const ratings = entries.flatMap((entry) => (entry.rating === null ? [] : [entry.rating]));
  if (ratings.length === 0) {
    return null;
  }
  return Math.round((10 * ratings.reduce((sum, rating) => sum + rating, 0)) / ratings.length) / 10;
}

function topTags(
  entries: readonly EntryRecord[],
  tags: ReadonlyMap<string, readonly ItemTag[]>,
): PersonalStats['topTags'] {
  const counts = new Map<string, { name: ItemTag['name']; count: number }>();
  for (const tag of entries.flatMap((entry) => tags.get(entry.itemId) ?? [])) {
    counts.set(tag.id, { name: tag.name, count: (counts.get(tag.id)?.count ?? 0) + 1 });
  }
  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.name.he.localeCompare(b.name.he, 'he'))
    .slice(0, TOP_TAGS);
}

function mostOrdered(
  entries: readonly EntryRecord[],
  refs: ReadonlyMap<string, ItemRef>,
): PersonalStats['mostOrdered'] {
  const lastEaten = new Map<string, number>();
  for (const entry of entries) {
    lastEaten.set(
      entry.itemId,
      Math.max(lastEaten.get(entry.itemId) ?? 0, Date.parse(entry.eatenAt)),
    );
  }
  const [favourite] = [...countBy(entries.map((entry) => entry.itemId))]
    .filter(([itemId, count]) => count >= FAVOURITE_FLOOR && refs.has(itemId))
    .sort(
      ([a, countA], [b, countB]) =>
        countB - countA || (lastEaten.get(b) ?? 0) - (lastEaten.get(a) ?? 0),
    );
  const item = favourite && refs.get(favourite[0]);
  return item ? { item, count: favourite[1] } : null;
}

/** Built from the diarist's own entries only, so it may use private ones. */
export function personalStats(
  entries: readonly EntryRecord[],
  refs: ReadonlyMap<string, ItemRef>,
  tags: ReadonlyMap<string, readonly ItemTag[]>,
  now: Date,
): PersonalStats {
  const byMonth = new Map<string, EntryRecord[]>();
  for (const entry of entries) {
    const month = monthOf(new Date(entry.eatenAt));
    const inMonth = byMonth.get(month);
    if (inMonth) {
      inMonth.push(entry);
    } else {
      byMonth.set(month, [entry]);
    }
  }
  return {
    entryCount: entries.length,
    venueCount: new Set(entries.map((entry) => entry.venueId)).size,
    itemCount: new Set(entries.map((entry) => entry.itemId)).size,
    averageRating: averageRating(entries),
    months: lastMonths(now).map((month) => {
      const inMonth = byMonth.get(month) ?? [];
      return {
        month,
        entryCount: inMonth.length,
        spent: totals(inMonth.flatMap((entry) => (entry.pricePaid ? [entry.pricePaid] : []))),
      };
    }),
    topTags: topTags(entries, tags),
    mostOrdered: mostOrdered(entries, refs),
  };
}
