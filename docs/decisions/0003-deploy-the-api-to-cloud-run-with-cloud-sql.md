# 0003. Deploy the API to Cloud Run with Cloud SQL

- Status: accepted
- Date: 2026-10-23

## Context

ADR 0002 puts `apps/api` on Cloud Run and Postgres on Cloud SQL in project `menu-b29eb`, behind a Hosting `/api/**` rewrite. This records how it is built, migrated and deployed. The Nx webpack build keeps `node_modules` external and copies `apps/api/package.json` as the runtime manifest, which had drifted from what the API imports (zod, Prisma).

## Decision

- Build the image from the pruned output (`pnpm nx run api:prune`) with `apps/api/Dockerfile`, which installs only the dependencies in `apps/api/package.json` (`pnpm install --prod --frozen-lockfile`). That manifest must list every runtime package the API and its libs import, at the root version; `apps/api/src/runtime-dependencies.spec.ts` enforces it.
- `.github/workflows/deploy-api.yml` builds and smoke-tests the image (`/api/health`) on every PR. On `main` it pushes to Artifact Registry, runs `prisma migrate deploy` through the Cloud SQL Auth Proxy, deploys Cloud Run and checks `/api/health` again.
- Names: region `europe-west1`, service and runtime service account `menu-api`, instance `menu-db`, Artifact Registry repository `menu`. The region and service id in `firebase.json` and the workflow must match.
- One Secret Manager secret, `DATABASE_URL`, uses the Cloud SQL Unix socket path (`?host=/cloudsql/<connection name>`). Cloud Run mounts that socket and the CI proxy serves the same path, so the secret works in both places.
- API deploys use their own service account, `api-deployer`, whose key is a secret of the `production` GitHub environment, limited to `main`. `FIREBASE_SERVICE_ACCOUNT` (used by every same-repo PR for Hosting previews) gets no database, secret or Cloud Run write access, so a branch cannot reach production data.

## Consequences

- Migrations run before the new revision ships, so a migration must work with the code that is still live (add first, remove in a later release).
- Preview channels share the production API and database until a staging service exists.
- The Hosting rewrite needs the Cloud Run service to exist, so a placeholder service is created by hand once (`docs/deployment.md`).
- `/api/health` does not touch the database, so the checks do not catch a bad `DATABASE_URL`; the first real endpoint should come with a check that does.
- A new runtime import in an API lib needs an entry in `apps/api/package.json`, or the API test fails.
