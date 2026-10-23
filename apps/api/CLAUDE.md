# apps/api

NestJS 11 shell, served under `/api`, port `PORT` (default 3000).

- This app only wires modules: `app.module.ts` imports `DbModule` and feature modules from `libs/api/<domain>/feature` (added by `nest-resource`), and registers `ApiExceptionFilter` globally. Keep it that way.
- `health/` is the only controller here; `GET /api/health` follows the `HealthResponse` contract.
- Database: Postgres via `libs/api/shared/db` (Prisma 7). `docker compose up -d`, copy `.env.example` to `.env`.
- Production: a container on Cloud Run with Cloud SQL (`Dockerfile`, `.github/workflows/deploy-api.yml`, skill `firebase-hosting`). The image installs only this app's `package.json` dependencies, so a new runtime import needs an entry there.
- Rules: `.claude/rules/nest.md`. Tests: `pnpm nx test api`.
