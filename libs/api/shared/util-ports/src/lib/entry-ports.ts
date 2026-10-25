import { type Price, type PricePoint } from '@menu/shared/contracts';

/**
 * One item's entries summed up, already safe to show. Entries that are not
 * public count only once there are at least 3 of them for that measure, so no
 * number can be differenced against public entries to recover a private one.
 */
export interface ItemEntryStats {
  ratingCount: number;
  ratingSum: number;
  wouldOrderAgainPercent: number | null;
  publicEntryCount: number;
  otherEntryCount: number | null;
  latestPublicPrice: Price | null;
  latestPublicPhotoUrl: string | null;
  priceHistory: PricePoint[];
}

export interface EntryStatsSource {
  statsByItem(): Promise<ReadonlyMap<string, ItemEntryStats>>;
  itemIdsWrittenBy(authorId: string): Promise<ReadonlySet<string>>;
  countEntriesAt(authorId: string, venueId: string): Promise<number>;
}

export const ENTRY_STATS = Symbol('ENTRY_STATS');
