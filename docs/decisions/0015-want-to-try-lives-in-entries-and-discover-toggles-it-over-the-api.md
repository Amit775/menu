# 0015. Want to try lives in entries and discover toggles it over the API

- Status: accepted
- Date: 2026-10-28

## Context

A user saves items they want to try (plan `docs/plans/2026-10-28-diarist-features.md`, 4a). The list is personal and private, like the diary, and is removed with the account. But the bookmark sits on discover's pages (reel card, item page), the list is a list of discover items with scores and distance, and the log form in `entries` offers to take an item off the list once it is logged. ADR 0004 lets `discover` read `entries`, never write it.

## Decision

- `saved_item` belongs to `entries`, which owns `PUT` and `DELETE /api/saved-items/:itemId`. Only an approved item can be saved.
- The API's `discover` reads the list through `EntryStatsSource.itemIdsSavedBy` (still a read), serves it as `GET /api/discover/saved`, and sets `savedByMe` on every discover item.
- The web `discover` domain toggles a bookmark by calling the entries endpoints from its own `DiscoverApiClient`, the cross-domain API call `architecture.md` allows. No web lib imports the other domain. The contract (`savedItemPath`, `SavedItemSchema`) is shared.
- `SavedItems` in `web-discover-data-access` holds the caller's changes so every discover page agrees. The log form tells it through `DataChanges` (`saved` topic, `web-shared-util-events`) when it takes an item off the list. It forgets everything on sign-in and sign-out.

## Consequences

- Personal data stays in one domain, so account deletion and export find it with the entries.
- Discover writes entries data only through the API, where `entries` checks the caller and the item; the API rules stay in one place.
- The `saved` topic is the second cross-domain event on the web; more of these should stay small facts, not shared state.
