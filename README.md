# Menu

Review, share and give feedback on items at restaurants and bars: the cocktail that was especially good, the dessert you didn't like.

Nx monorepo with an Angular 22 web app, a NestJS 11 API, Postgres via Prisma 7, and shared Zod contracts. Built to be worked on by AI agents safely: conventions are enforced by generators, lint, types, tests and Claude Code hooks, not only by docs.

## Getting started

```bash
nvm use                      # Node 24
corepack enable              # pnpm 10 (from packageManager)
pnpm install
cp .env.example .env
docker compose up -d         # Postgres on :5432
pnpm start                   # API on :3000, web on :4200 (proxies /api)
```

## Everyday commands

| Command                                         | What it does                 |
| ----------------------------------------------- | ---------------------------- |
| `pnpm nx affected -t lint typecheck test build` | The gate (same as CI)        |
| `pnpm nx run-many -t lint typecheck test build` | Everything                   |
| `pnpm nx e2e web-e2e`                           | Playwright e2e               |
| `pnpm nx format:write`                          | Prettier                     |
| `pnpm nx graph`                                 | Project graph                |
| `pnpm nx run api-shared-db:prisma-migrate`      | Create/apply a dev migration |

## Deployment

The web app is on Firebase Hosting: each PR gets a preview URL, merges to `main` go live (`.github/workflows/deploy-web.yml`). The API runs on Cloud Run with Cloud SQL behind `/api` (`.github/workflows/deploy-api.yml`). One-time setup for Firebase, Google Cloud and Nx Cloud is in [`docs/deployment.md`](docs/deployment.md); the decision is ADR 0002.

## Structure

```
apps/
  web/          Angular shell (bootstrap, routes, providers)
  web-e2e/      Playwright
  api/          Nest shell (AppModule wiring, /api/health)
libs/
  shared/contracts/   Zod schemas + types shared by web and api
  api/shared/util/    ZodValidationPipe, ApiExceptionFilter
  api/shared/db/      Prisma schema, PrismaService, DbModule
  web/<domain>/...    feature-*, data-access, ui   (generated per domain)
  api/<domain>/...    feature, data-access         (generated per domain)
tools/
  workspace-plugin/   Generators + inferred typecheck target
  eslint/             Module boundary config, shared Angular lint config
  eslint-rules/       Custom lint rules (require-project-tags)
docs/decisions/       ADRs (start with 0001)
.claude/              Claude Code rules, skills, hooks, reviewer agent
```

Every project is tagged `platform:*`, `scope:*` and `type:*`; `@nx/enforce-module-boundaries` rejects imports the rules in `tools/eslint/module-boundaries.json` don't allow.

## Generators

```bash
pnpm nx g @menu/workspace-plugin:domain reviews --resource=review   # whole vertical slice
pnpm nx g @menu/workspace-plugin:contract --domain=reviews --name=venue
pnpm nx g @menu/workspace-plugin:nest-resource --domain=reviews --name=venue
pnpm nx g @menu/workspace-plugin:data-access-lib --domain=reviews --name=venue
pnpm nx g @menu/workspace-plugin:feature-lib --domain=reviews --name=browse
pnpm nx g @menu/workspace-plugin:ui-lib reviews
pnpm nx g @menu/workspace-plugin:adr "Use Capacitor for mobile"
```

## Working with Claude Code

`CLAUDE.md` is the entry point. Hooks in `.claude/settings.json` format every edit, block edits to guardrail files and dangerous commands, and stop Claude from finishing while affected lint, typecheck or tests fail. Use the `reviewer` subagent before committing. Personal overrides go in `.claude/settings.local.json` (gitignored); set `MENU_ALLOW_GUARDRAIL_EDITS=1` under `env` there when you intentionally want Claude to change lint, tsconfig, hooks or CI.

The Nx Claude plugin (enabled in settings) provides the Nx MCP server and skills; `.mcp.json` adds the Angular CLI MCP server.
