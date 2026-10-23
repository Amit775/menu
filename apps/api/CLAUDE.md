# apps/api

NestJS 11 shell, served under `/api`, port `PORT` (default 3000).

- This app only wires modules: `app.module.ts` imports `DbModule` and feature modules from `libs/api/<domain>/feature` (added by `nest-resource`), and registers `ApiExceptionFilter` globally. Keep it that way.
- Auth: `AuthModule.forRoot` registers a global `AuthGuard` (`@menu/api/shared/util-auth`). Mark routes `@Authenticated()` or `@AdminOnly()`, read the caller with `@CurrentPrincipal()` / `@OptionalPrincipal()`, and check venue rights with `canEditVenue(principal, venueId)`. The users domain resolves the principal; other domains never import it.
- Cross-domain ports: interfaces and tokens live in `@menu/api/shared/util-ports`; `ports.module.ts` (global) binds each token to the domain that implements it, and `app.module.spec.ts` checks every binding. A new port gets a line in both.
- `health/` is the only controller here; `GET /api/health` follows the `HealthResponse` contract.
- Database: Postgres via `libs/api/shared/db` (Prisma 7). `docker compose up -d`, copy `.env.example` to `.env`.
- Production: a container on Cloud Run with Cloud SQL (`Dockerfile`, `.github/workflows/deploy-api.yml`, skill `firebase-hosting`). The image installs only this app's `package.json` dependencies, so a new runtime import needs an entry there.
- Rules: `.claude/rules/nest.md`. Tests: `pnpm nx test api`.
