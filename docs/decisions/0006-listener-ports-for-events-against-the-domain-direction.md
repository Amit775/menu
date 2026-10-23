# 0006. Listener ports for events against the domain direction

- Status: accepted
- Date: 2026-10-23

## Context

ADR 0004 points dependencies one way: `users` <- `menus` <- `entries` <- `discover`. Some changes in an earlier domain must reach a later one. When an approver merges a pending item into an existing one, the submitter's entries must move to the target item (product spec, J4). `menus` owns the merge, `entries` owns the entries, and `menus` must not depend on `entries`.

## Decision

- An earlier domain announces such a change through a listener port: an interface and an injection token in `@menu/api/shared/util-ports` (`scope:shared`), named after the event (`ItemMergeListener.onItemMerged`).
- The later domain implements the listener; `apps/api/src/app/ports.module.ts` binds the token (global module), and `app.module.spec.ts` checks the binding.
- The announcing service injects the listener as required, not optional, so a missing binding fails at boot instead of silently dropping the event.
- Listeners are idempotent, and the announcing operation can be repeated to re-run them, so a failure after the state change can be completed by retrying (the merge endpoint does this).
- Queries in the other direction (entries asking menus whether an item accepts entries, entries asking users for display names) use ordinary ports bound the same way.

## Consequences

- `menus` still imports nothing from `entries`; it only knows the listener interface in a shared lib.
- Starting `ItemModule` outside `apps/api` (in a test) needs a listener provided, usually a stub.
- If events multiply, an in-process event bus or an outbox can replace individual listener ports behind the same interfaces; that would get its own ADR.
