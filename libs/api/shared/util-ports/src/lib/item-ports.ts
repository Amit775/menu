/**
 * Ports between the menus and entries domains (ADR 0004): each side depends on
 * these interfaces only, and `apps/api` binds them to the implementations.
 */
import { type Principal } from '@menu/api/shared/util-auth';
import { type ItemRef } from '@menu/shared/contracts';

export interface ItemMergeListener {
  onItemMerged(sourceItemId: string, targetItemId: string): Promise<void>;
}

export const ITEM_MERGE_LISTENER = Symbol('ITEM_MERGE_LISTENER');

export interface EntryTarget {
  id: string;
  venueId: string;
  /** Approved, archived or merged: its public entries may be listed. Pending and rejected items show only the caller's own. */
  isPublic: boolean;
  acceptsEntry: boolean;
  /** An entry may name an available variation; one it already names stays even once unavailable. */
  variations: { id: string; available: boolean }[];
}

export interface ItemCatalog {
  findForEntries(principal: Principal | null, itemId: string): Promise<EntryTarget | null>;
  /**
   * Names of these items and their venues, in any state; unknown ids are left
   * out. Only for entries the caller may already see (their diary, an open share link).
   */
  refsFor(itemIds: readonly string[]): Promise<ReadonlyMap<string, ItemRef>>;
}

export const ITEM_CATALOG = Symbol('ITEM_CATALOG');
