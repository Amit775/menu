import { type Price } from '@menu/shared/contracts';

/**
 * One item's entries summed up, already safe to show. Entries that are not
 * public count only once there are at least 3 of them for that measure, so no
 * number can be differenced against public entries to recover a private one.
 */
export interface RatingTotal {
  ratingCount: number;
  ratingSum: number;
}

export interface ItemEntryStats extends RatingTotal {
  /** Keyed by variation id; a variation with no counted rating is left out. */
  variationRatings: ReadonlyMap<string, RatingTotal>;
  wouldOrderAgainPercent: number | null;
  publicEntryCount: number;
  otherEntryCount: number | null;
  latestPublicPrice: Price | null;
  latestPublicPhotoUrl: string | null;
}

export interface EntryStatsSource {
  statsByItem(): Promise<ReadonlyMap<string, ItemEntryStats>>;
  itemIdsWrittenBy(authorId: string): Promise<ReadonlySet<string>>;
  countEntriesAt(authorId: string, venueId: string): Promise<number>;
}

export const ENTRY_STATS = Symbol('ENTRY_STATS');
