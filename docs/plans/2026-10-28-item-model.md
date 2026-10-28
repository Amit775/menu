# Item history, variations and item photos

- Goal: phase 2 of the next-phase plan (https://claude.ai/artifact/6iZdUcnzBbpdxSQWRcSfHm). Replace the item page's price history with the history of the item itself, let an item define variations that entries pick from, and let Owners and Admins attach photos to an item.
- Shape: stacked PRs, one per slice, starting from main. Phase 3 (contributor role) builds on these tables.

## Decisions (recommendations in the plan doc, taken while Bublil's answers are open)

- Q1: the history is the item's own changes (added to the menu, renamed, price, section, tags, description, variations, archived). The monthly average of prices paid goes away.
- Q2: a variation may have its own price; empty means the item's price.
- Q3: picking a variation on an entry is optional, and an item has one list of variations (no second axis).

## Design

- `item_revision` (menus): one row per create, submit, edit, approval, rejection, merge and archive, written in the same transaction as the change. It stores a full `snapshot` of the item's catalog fields (jsonb, `ItemSnapshotSchema`), the kind, when, and `changed_by_id` (never leaves the API). Diffs are computed on read from consecutive snapshots, so a new field (variations) needs no new change type in storage.
- The public history starts at the item's first `created` or `approved` revision; changes made while it was pending are not shown.
- `discover` reads `item_revision` like the other menus tables and returns `history` on the item page, newest first, with section and tag names resolved.

## Slices

| #   | Slice                                                                                       | Status      |
| --- | ------------------------------------------------------------------------------------------- | ----------- |
| 1   | Item history: contract, `item_revision` table with backfill, menus writes revisions         | in progress |
| 2   | Item history on the item page; remove the paid-price history (contract, entries stats, web) | todo        |
| 3   | Variations: contract, `item.variations`, `entry.variation_id`, API rules                    | todo        |
| 4   | Variations in the web: item form, log form picker, item page, search by a variation's tags  | todo        |
| 5   | Item photos: upload by Owner or Admin, shown on feed cards without an entry photo           | todo        |
