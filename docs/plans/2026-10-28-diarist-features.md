# Diarist features (phase 4)

Phase 4 of the next-phase plan: four independent features on the item model from phase 2. Each is its own PR, stacked on the contributor role (#29).

## 4a. Want to try (done)

- `saved_item` (account, item, saved at) in `entries`, with the rest of a user's personal data. Always private. `account_id` has no foreign key, like `entry.author_id` (ADR 0004).
- `PUT` and `DELETE /api/saved-items/:itemId` (entries, ADR 0015). Only an approved item can be saved; saving again keeps the first time.
- `GET /api/discover/saved` lists the caller's items newest first, through `EntryStatsSource.itemIdsSavedBy`; items no longer on a menu drop out. Every discover item carries `savedByMe`.
- A merge moves saved items to the target, dropping duplicates (`EntryMergeListener`).
- Web: a bookmark on the reel card and the item page (signed in only), a marker on item rows, `/saved` linked from the profile, and the log form offers to take a saved item off the list once it is logged (`ItemEntries.savedByMe`).
- Account deletion (phase 1, skipped for now) must remove the account's saved items.

## 4b. Personal stats (done)

- `GET /api/entries/me/stats`, computed from the caller's own entries (private ones included) with no new table: entries this month and all time, venues and items tried, average rating given (one decimal), entries and spending for the last six months in Israel time, the three tags logged most, and the item ordered most (once logged at least twice).
- Tag names come through a new `ItemCatalog.tagsFor` port method; tags are the item's own, not its variations'.
- Web: a stats card at the top of the whole diary (`/diary`, linked from the profile as "My diary"), not on the profile itself, because `users` must not import `entries` (ADR 0004). A venue's diary leaves it out, and a failed read hides the card without blocking the diary.

## 4c. "No longer on the menu" reports (done)

- Any signed-in user reports an approved item from its page: "no longer served" or "price changed", with an optional new price. One open report per diner and item (ADR 0016).
- The reports join the venue's "To approve" tab, counted per item with the prices given; the reporter is never shown. The Owner or Admin confirms the item is still served, sets a reported price, archives it, or edits it.
- Archiving closes all of an item's reports, a price or variation edit closes its price reports, and "still on the menu" closes all of them with a `confirmed` revision.
- The item page shows "confirmed on the menu" from the latest added, approved, edited or confirmed revision.

## 4d. WhatsApp link previews (done)

- Hosting rewrites `/e/*` to the API, which serves `GET /e/:token` outside `/api`: the web app's `index.html`, read from Hosting and kept a minute, with the entry's Open Graph tags (item, venue, rating, excerpt, author, photo) and `noindex` (ADR 0017).
- A private, hidden, deleted or malformed link gets one generic preview. A person who opens the link gets the app as before.
