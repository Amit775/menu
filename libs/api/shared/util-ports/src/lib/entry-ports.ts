/** Ports the entries domain offers to discover (ADR 0004): aggregates only, never an entry. */
import { type PricePoint } from '@menu/shared/contracts';

/**
 * One item's entries summed up, already safe to show. Entries that are not
 * public count only once there are at least 3 of them for that measure, so no
 * number can be differenced against public entries to recover a private one.
 */
export interface ItemEntryStats {
  /** Authors whose latest rating counts. */
  ratingCount: number;
  ratingSum: number;
  /** Null under 3 counted answers. */
  wouldOrderAgainPercent: number | null;
  publicEntryCount: number;
  /** Entries that are not public; null under 3. */
  otherEntryCount: number | null;
  /** The newest price in a public entry. */
  latestPublicPrice: number | null;
  priceHistory: PricePoint[];
}

/** Implemented by entries. */
export interface EntryStatsSource {
  /** Stats for every item that has unhidden entries. */
  statsByItem(): Promise<ReadonlyMap<string, ItemEntryStats>>;
  /** Items this author has written about (the flag on cards). */
  itemIdsWrittenBy(authorId: string): Promise<ReadonlySet<string>>;
  /** "Your N entries here". */
  countEntriesAt(authorId: string, venueId: string): Promise<number>;
}

export const ENTRY_STATS = Symbol('ENTRY_STATS');
