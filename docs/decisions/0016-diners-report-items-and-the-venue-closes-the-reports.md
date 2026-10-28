# 0016. Diners report items and the venue closes the reports

- Status: accepted
- Date: 2026-10-28

## Context

Menus go stale: dishes are dropped and prices change, and Owners rarely tell us. Diners notice first (plan `docs/plans/2026-10-28-diarist-features.md`, 4c). A report must reach the venue's Owner or an Admin without naming the diner, must not let one diner flood the queue, and must not need a new domain: items and their queue belong to `menus`.

## Decision

- `item_report` (`menus`) holds one open report per diner and item: `gone` (no longer served) or `price` (with an optional new price). Reporting again replaces the diner's report. Only an approved item at a visible venue can be reported, from `POST /api/items/:id/reports`; the write share-locks the item row, so it cannot land after an archive closed the reports.
- The venue's Owner or an Admin reads `GET /api/venues/:venueId/item-reports`: counts per item, the distinct prices given and the day of the newest report (never its time), never who reported. Contributors may edit items (ADR 0014) but do not see reports, as they do not see pending items.
- A report is closed by deleting it, in the same transaction as what answered it: archiving or merging the item closes all its reports, an edit that changes the list price or a variation's price closes its price reports, and `DELETE /api/items/:id/reports` ("still on the menu") closes all of them and records a `confirmed` revision.
- The item page shows `lastConfirmedAt`, the latest `created`, `approved`, `updated` or `confirmed` revision. A `confirmed` revision changes nothing, so the public history shows no line for it.
- The web manager loads reports separately from the venue (`VenueManagerStore.loadReports`), because Contributors open the item form with the same store.
- The report form sits on the discover item page; web `discover` sends it through its own `DiscoverApiClient`, the cross-domain API call `architecture.md` allows (as in ADR 0015).

## Consequences

- No report history is kept, so nothing about a diner's reports outlives them; a reporter's account deletion cascades to their open reports.
- "Last confirmed" follows the menu's own changes, not diners' entries; adding the newest public entry later would need it in `ItemEntryStats`.
- The report controllers are registered before `ItemController`, whose `:id/:decision` route would otherwise take `:id/reports`; a spec guards the order.
