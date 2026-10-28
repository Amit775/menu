# 0001. Stack and architecture

- Status: accepted
- Date: 2026-10-22

## Context

Menu is a new app for reviewing, sharing and giving feedback on items at restaurants and bars. It starts with a web app and will add iOS and Android. Much of the code will be written by AI agents, so conventions must be enforced by tools, not only described.

## Decision

- **Monorepo:** Nx 24, integrated, `project.json` per project, pnpm 10, Node 24.
- **Web:** Angular 22, standalone, zoneless, signals, esbuild, SCSS, client-side SPA. **UI:** Angular Material 3. **State:** NgRx Signal Store.
- **API:** NestJS 11 (webpack build). **Database:** Postgres with Prisma 7 (`prisma-client` generator, `@prisma/adapter-pg`).
- **Contracts:** Zod 4 schemas in `libs/shared/contracts`, shared by web and api. Nest validates with a `ZodValidationPipe`; the web validates responses with the same schemas. Chosen over class-validator DTOs plus a generated OpenAPI client for a single source of truth.
- **Tests:** Vitest for unit tests everywhere (Angular's unit-test builder for the app, AnalogJS Vitest for Angular libs), Playwright for e2e.
- **Mobile:** Capacitor wrapping the Angular SPA, added later. SSR only for public share routes if link previews need it, via Angular's per-route render modes.
- **Structure:** `libs/<platform>/<domain>/<type>` with `platform:*`, `scope:*` and `type:*` tags enforced by `@nx/enforce-module-boundaries` (config in `tools/eslint/module-boundaries.json`) and a custom `require-project-tags` lint rule. Domains are registered with the `domain` generator.
- **Guardrails:** strict TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, strict templates, extended diagnostics as errors), `typescript-eslint` strict-type-checked, angular-eslint signal and OnPush rules, Prettier, commitlint, Husky. Claude Code hooks format on edit, block edits to guardrail files, and refuse to stop while affected checks fail. CI runs the same checks, with Nx Cloud (replaced by the GitHub Actions cache in ADR 0018).

## Consequences

- Agents get structure from generators and are corrected by lint, types and tests, so conventions hold over long sessions.
- Any new library or a change to these choices needs a new ADR that supersedes the relevant part of this one.
- Strict options (`exactOptionalPropertyTypes` in particular) add friction with some third-party types; prefer fixing types over loosening options.
