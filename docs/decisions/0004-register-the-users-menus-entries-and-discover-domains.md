# 0004. Register the users, menus, entries and discover domains

- Status: accepted
- Date: 2026-10-23

## Context

The product spec (decision O3, approved by the product owner on 2026-10-23) splits the app into four domains. Four is the smallest split that keeps private entries apart from the public read models:

| Domain     | Owns                                                                            | Depends on                                      |
| ---------- | ------------------------------------------------------------------------------- | ----------------------------------------------- |
| `users`    | Account, ownership of venues, roles (Admin, Owner, User), sign-in, language     | nothing                                         |
| `menus`    | Venue, MenuSection, Item and its approval lifecycle, tag vocabulary, map pins   | `users` (who may edit or approve)               |
| `entries`  | Entry, visibility, share tokens, photo upload, a user's history per venue       | `users` (author), `menus` (item ids and names)  |
| `discover` | ItemScore, RankingStrategy, search index, feed order, tag leaderboards, near me | `menus` (approved items), `entries` (read-only) |

The names follow the app's own vocabulary (the Discover tab, menu items, your entries) and replace the earlier identity, catalog, diary and discovery.

## Decision

- Register the four domains with `pnpm nx g @menu/workspace-plugin:domain <name>`, which adds `scope:users`, `scope:menus`, `scope:entries` and `scope:discover` to `tools/eslint/module-boundaries.json`.
- Keep the existing boundary rule: a `scope:<domain>` library imports only its own domain and `scope:shared`. The "depends on" column is satisfied without importing another domain's libraries:
  - Shapes another domain needs (an item id and name, an author's display name, a rated entry as discover reads it) are Zod contracts in `@menu/shared/contracts`, which every domain may import.
  - Behaviour another domain needs (is this user an Owner of this venue, which entries are rated) is reached through the owning domain's API, or, inside `apps/api`, through a port defined in a `scope:shared` lib and wired by the app (`scope:app` may import every domain).
- Dependencies point one way only, in the order of the table: `users` <- `menus` <- `entries` <- `discover`, with `discover` also reading `menus`. No domain reaches into a domain listed after it.
- Cross-domain values that belong to no single domain (bilingual text, money in agorot, geo point) live in `scope:shared` libraries.

## Consequences

- Private entry data can only leave `entries` through a contract it publishes, which is where the privacy rules (anonymous scores, 3-entry floor, Admins never read private entries) are enforced.
- `discover` can change its ranking without touching how entries are stored.
- The one-way direction above is a convention reviewed by the `reviewer` subagent; lint enforces isolation, not direction. If direct imports between domains are ever wanted, that needs a lint change and a new ADR.
- Each first resource in a domain is scaffolded later with `domain <name> --resource=<r>` or the per-layer generators.
