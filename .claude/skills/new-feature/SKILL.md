---
name: new-feature
description: Add a new user-facing feature (a page, a resource or a whole domain) to the menu workspace using the workspace generators. Use when asked to build a feature, screen, or domain end to end.
---

# Add a feature

Build features as small vertical slices: one resource, end to end, with tests. Use generators for every new file structure; write only the logic by hand.

## 1. Plan

- Confirm the domain and resource names with the user if they are not given. Domains are a product decision.
- Write the plan to `docs/plans/<yyyy-mm-dd>-<slug>.md` (goal, slices, open questions) so a fresh session can resume it.

## 2. Scaffold (in this order)

```bash
# New domain (once): registers scope:<domain> and scaffolds the whole first slice
pnpm nx g @menu/workspace-plugin:domain <domain> --resource=<resource>

# Or, inside an existing domain, piece by piece:
pnpm nx g @menu/workspace-plugin:contract --domain=<domain> --name=<resource>
pnpm nx g @menu/workspace-plugin:nest-resource --domain=<domain> --name=<resource>
pnpm nx g @menu/workspace-plugin:data-access-lib --domain=<domain> --name=<resource>
pnpm nx g @menu/workspace-plugin:feature-lib --domain=<domain> --name=<page>
pnpm nx g @menu/workspace-plugin:ui-lib <domain>            # once per domain
pnpm nx g @nx/angular:component libs/web/<domain>/ui/src/lib/<name>/<name> --export
```

Run with `--dry-run` first when unsure what a generator will touch.

## 3. Fill in, test first

1. Shape the contract (`libs/shared/contracts/src/lib/<domain>/<resource>.contract.ts`); update its spec.
2. Add fields to the Prisma model, then `pnpm nx run api-shared-db:prisma-migrate` (database via `docker compose up -d`).
3. Write failing specs for the repository, service, store and page; then implement until green.
4. Presentational pieces go in `ui`; the page in `feature-*` injects the store.

## 4. Verify and review

```bash
pnpm nx affected -t lint typecheck test build
pnpm nx e2e web-e2e   # when routes or UI flows changed
```

Then run the `reviewer` subagent on the diff and fix what it reports before committing.
