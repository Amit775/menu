/**
 * Ports between the menus and entries domains (ADR 0004): each side depends on
 * these interfaces only, and `apps/api` binds them to the implementations.
 */

/** Told when a pending item is merged into an existing one, so entries can follow it. */
export interface ItemMergeListener {
  onItemMerged(sourceItemId: string, targetItemId: string): Promise<void>;
}

export const ITEM_MERGE_LISTENER = Symbol('ITEM_MERGE_LISTENER');
