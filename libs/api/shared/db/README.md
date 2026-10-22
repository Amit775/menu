# @menu/api/shared/db

Prisma 7 + Postgres for the API. `DbModule` is global and exposes `PrismaService`.

- Schema: `prisma/schema.prisma`. Migrations: `prisma/migrations` (committed).
- Generated client: `src/generated/prisma` (gitignored, created by the `prisma-generate` target, which `build`, `test`, `lint` and `typecheck` depend on).
- Local database: `docker compose up -d` at the repo root, then `pnpm nx run api-shared-db:prisma-migrate`.
- Only repositories in `libs/api/<domain>/data-access` may use `PrismaService`.
