# Architecture

Menu is an app to review, share and give feedback on items at restaurants and bars. Its domains are `users`, `menus`, `entries` and `discover` (ADR 0004, which also fixes the one-way dependency direction between them). Do not invent new ones: ask the user, then register them with the `domain` generator.

## Layout

- `apps/*` are thin shells: bootstrap, routing, wiring. No feature code in apps.
- `libs/<platform>/<domain>/<type>`: platform is `web`, `api` or `shared`; domain is a registered domain or `shared`.
- `libs/shared/contracts`: Zod schemas and inferred types for every request and response. The only place API shapes are defined.
- `tools/workspace-plugin`: our generators and the inferred `typecheck` target. `tools/eslint-rules`: custom lint rules.

## Tags (enforced by `@nx/enforce-module-boundaries` and `@nx/workspace-require-project-tags`)

Every project has exactly one `platform:*`, one `scope:*` and one `type:*` tag. The allowed dependencies live in `tools/eslint/module-boundaries.json`.

| Type               | May import                                |
| ------------------ | ----------------------------------------- |
| `type:app`         | feature, data-access, ui, util, contracts |
| `type:feature`     | data-access, ui, util, contracts          |
| `type:data-access` | data-access, util, contracts              |
| `type:ui`          | ui, util, contracts                       |
| `type:contracts`   | contracts, util                           |
| `type:util`        | util, contracts                           |

- `platform:web` and `platform:api` never import each other; both may import `platform:shared`.
- `scope:<domain>` imports only its own domain and `scope:shared`. Apps use `scope:app`.
- Import a lib only through its `@menu/...` path (its `src/index.ts`). Never deep-import.

## Rules

- Create projects with generators, never by hand. A hand-written `project.json` fails lint unless its tags are valid. Why: generators encode tags, paths and test setup.
- Cross-domain needs go through a `shared` lib or an API call, and get an ADR. Why: domain isolation is what keeps features independently changeable.
- Record architectural decisions with `pnpm nx g @menu/workspace-plugin:adr "<title>"`. Read `docs/decisions/` before proposing a change that touches architecture.
- Do not add dependencies (`pnpm add`) without the user's approval. The stack is fixed in ADR 0001.
