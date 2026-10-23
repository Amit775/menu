# 0010. Roles reach every web domain through util-auth

- Status: accepted
- Date: 2026-10-23

## Context

The Owner and Admin pages live in the `menus` web domain (venues, menus, the pending queue, tags) and the `users` web domain (people, Owners). They need to know whether the signed-in account is an Admin or which venues it owns: to show the "my venues" tab, to guard routes, and to hide actions the API would refuse. That knowledge comes from `GET /api/accounts/me`, which the `users` domain loads into its `AccountStore`. `menus` may not import `users` (ADR 0004), and the app shell should not reach into a domain's store for a cross-cutting fact.

## Decision

`web-shared-util-auth`, which already knows who is signed in, also holds what they may manage: `Roles` (`isAdmin`, `ownedVenueIds`, `canManage`, `canEditVenue`). The `users` domain is its only writer: `AccountStore` sets the roles when the account loads, sets no roles when loading fails, and clears them on sign-out. Every other domain only reads.

`managerGuard` (Owners and Admins) and `adminGuard` (Admins) wait for the session and for the roles, then send a visitor to sign in, a plain user to their profile, and an Owner away from Admin-only pages.

## Consequences

- Domains stay independent: `menus` guards its pages without knowing about accounts.
- Roles in the browser only shape the UI. The API checks every permission again from the request's principal, so a stale or forged role in the client changes nothing.
- Roles change when the account reloads (sign-in, app start). An Admin who grants themselves a venue sees it after the next reload; that is acceptable for the MVP.
