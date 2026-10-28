# 0014. Contributors are a role users apply for

- Status: accepted
- Date: 2026-10-28

## Context

Menus grow faster than Owners and Admins can approve suggestions. Some diners know many venues well, and the next-phase plan (phase 3, question Q4) adds a Contributor role: a user asks for it from their profile, an Admin decides, and a Contributor adds items without waiting for approval and puts photos on them. Owners stay the ones who decide about their own venue.

## Decision

- `Role` becomes `user | contributor | admin`. An Admin has every Contributor right, so an account is never both; granting the role to an Admin, or taking it from one, leaves them an Admin. The API principal and the web `Roles` gain `isContributor`, and `canContribute` means Contributor or Admin.
- A Contributor, at every visible venue, may add items (approved at once, with no submitter), edit approved items and their variations, and set or remove an item's photo. A Contributor may not approve, reject, merge or archive items, see others' pending submissions, edit sections, or open a venue's manage page. `MenuItem` keeps the two rights apart: `canBeEditedBy` for edits and photos, `canBeDecidedBy` (the venue's Owner or an Admin) for decisions and for seeing pending items.
- Applications live in `contributor_application` (`users` domain): the note (1 to 500 characters), `pending | approved | rejected`, who decided and when. `GET` and `POST /api/accounts/me/contributor-application` read and file the caller's own; `GET /api/contributor-applications` lists pending ones and `POST /api/contributor-applications/:id/approve|reject` decides, both for Admins. Approving sets the role in the same transaction. `PUT /api/accounts/:id/contributor` lets an Admin grant or take back the role directly.
- One pending application per account: filing locks the account row, so two submits at once cannot both pass. After a rejection the user may apply again 30 days after the decision; after the role is taken back they may apply again at once. Who decided is stored but never sent.
- In the web app, the item form routes take `itemEditorGuard` (Contributor, Admin or the venue's Owner); the rest of `/manage` keeps its guards. The item page shows an edit link to whoever may edit the item.

## Consequences

- Contributor edits are recorded in the item history like any other change, so an Owner or Admin can see a bad edit and undo it.
- Venues are still added by Admins only; letting Contributors suggest venues is left for later.
- A user sees the role after their account reloads, as with other roles (ADR 0010).
