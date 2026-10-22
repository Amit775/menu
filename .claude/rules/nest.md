---
paths:
  - 'apps/api/**'
  - 'libs/api/**'
---

# NestJS (v11) + Prisma (v7)

## Layering (one direction only)

Controller -> Service -> Repository -> `PrismaService`.

- Controller: HTTP only. Route paths come from the contract (`@Controller(reviewPath)`). Validate every body, query and param with `new ZodValidationPipe(Schema)` from `@menu/api/shared/util`. Return contract types.
- Service: business rules. No HTTP types, no Prisma calls.
- Repository (in `libs/api/<domain>/data-access`): the only code that touches Prisma. Maps rows to contract types (e.g. `Date` to ISO string).
- Feature modules live in `libs/api/<domain>/feature` and are registered in `apps/api/src/app/app.module.ts` by the `nest-resource` generator.

## Rules

- Generate resources with `pnpm nx g @menu/workspace-plugin:nest-resource --domain=<d> --name=<r>` after creating its contract. Why: it wires the contract, pipe, repository, Prisma model and specs consistently.
- Constructor injection is correct in Nest (unlike Angular).
- Throw Nest `HttpException`s (`NotFoundException`, ...). `ApiExceptionFilter` maps everything to the `ApiError` contract; never return error bodies by hand.
- Use Nest `Logger`, never `console`.
- Read config from `process.env['NAME']` with a default, in one place per lib. Never commit secrets; `.env` is gitignored, `.env.example` documents variables.

## Database

- Schema: `libs/api/shared/db/prisma/schema.prisma`. Models use `@@map` snake_case table names and `@map` for snake_case columns.
- After a schema change: `pnpm nx run api-shared-db:prisma-migrate` (needs `docker compose up -d`), commit the migration folder.
- Never run `prisma migrate reset` or edit an applied migration.
