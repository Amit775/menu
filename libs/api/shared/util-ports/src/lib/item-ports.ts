/**
 * Ports between the menus and entries domains (ADR 0004): each side depends on
 * these interfaces only, and `apps/api` binds them to the implementations.
 */
import { type Principal } from '@menu/api/shared/util-auth';

/** Told when a pending item is merged into an existing one, so entries can follow it. */
export interface ItemMergeListener {
  onItemMerged(sourceItemId: string, targetItemId: string): Promise<void>;
}

export const ITEM_MERGE_LISTENER = Symbol('ITEM_MERGE_LISTENER');

/** What entries needs to know about an item the caller can see. */
export interface EntryTarget {
  id: string;
  venueId: string;
  /** Approved, archived or merged: its public entries may be listed. Pending and rejected items show only the caller's own. */
  isPublic: boolean;
  /** Whether the caller may log an entry on it now. */
  acceptsEntry: boolean;
}

/** Implemented by menus. */
export interface ItemCatalog {
  /** Null when the item does not exist or the caller cannot see it. */
  findForEntries(principal: Principal | null, itemId: string): Promise<EntryTarget | null>;
}

export const ITEM_CATALOG = Symbol('ITEM_CATALOG');
