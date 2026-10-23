# Menu

An app to review, share and give feedback on items at restaurants and bars. Nx monorepo: Angular 22 web app (`apps/web`), NestJS 11 API (`apps/api`), shared Zod contracts. Domains are not defined yet: ask before inventing any.

## Commands

```bash
pnpm install                                   # Node 24 (.nvmrc), pnpm 10
pnpm start                                     # api (3000) + web (4200, proxies /api)
docker compose up -d                           # local Postgres for the API
pnpm nx affected -t lint typecheck test build  # the gate; same as CI
pnpm nx run-many -t lint typecheck test build  # everything
pnpm nx e2e web-e2e                            # Playwright
pnpm nx g @menu/workspace-plugin:<generator>   # see Generators below
```

Run tasks through `pnpm nx`, never the underlying tool. `typecheck` uses `ngc` for Angular projects, so template errors fail it.

## Hard rules

1. Create projects and resource files with generators, not by hand. Generators set tags, paths and specs; lint rejects untagged projects.
2. Every API request and response shape lives in `@menu/shared/contracts` as a Zod schema. Validate input in Nest with `ZodValidationPipe` and HTTP responses in Angular with the schema.
3. Respect module boundaries (`.claude/rules/architecture.md`). Never silence them; restructure instead.
4. Never weaken guardrails to get green: lint config, `tsconfig.base.json`, hooks, CI and tests are protected. Stop and ask.
5. Write the failing test first. Done means `pnpm nx affected -t lint typecheck test` passes (the Stop hook enforces it).
6. Do not add dependencies or choose libraries. The stack is fixed in `docs/decisions/0001-stack-and-architecture.md`.
7. Commits follow Conventional Commits with an Nx project as scope (`feat(api): ...`); commitlint enforces it.

## Generators (`tools/workspace-plugin`)

| Generator                         | Creates                                                                            |
| --------------------------------- | ---------------------------------------------------------------------------------- |
| `domain <name> [--resource=<r>]`  | Registers `scope:<name>`; with a resource, scaffolds the full slice below          |
| `contract --domain --name`        | Zod schema + types + spec in `libs/shared/contracts`                               |
| `nest-resource --domain --name`   | Nest module/controller/service, Prisma repository + model, specs, app registration |
| `data-access-lib --domain --name` | Signal Store + validated API client + specs                                        |
| `feature-lib --domain --name`     | Routed OnPush page + lazy route in `apps/web`                                      |
| `ui-lib <domain>`                 | Presentational component lib                                                       |
| `adr "<title>"`                   | Numbered ADR in `docs/decisions`                                                   |

## Where things are

- Conventions: `.claude/rules/` (architecture, angular, nest, testing). App specifics: `apps/web/CLAUDE.md`, `apps/api/CLAUDE.md`.
- Procedures: skills `new-feature` and `api-endpoint` in `.claude/skills/`.
- Review: run the `reviewer` subagent on your diff before committing.
- Decisions: `docs/decisions/` (read before proposing architecture changes; add with the `adr` generator). Plans for multi-session work: `docs/plans/`.

## Working loop

Explore, plan (write non-trivial plans to `docs/plans/`), implement in small vertical slices test-first, verify, review with `reviewer`, commit. Use `/clear` between unrelated tasks. When the same mistake happens twice, propose a lint rule or generator change rather than a longer prompt.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
