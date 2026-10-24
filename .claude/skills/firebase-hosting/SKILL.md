---
name: firebase-hosting
description: Change how the web app is served on Firebase Hosting (rewrites, redirects, headers, caching, preview channels), how the API ships to Cloud Run with Cloud SQL, or check a deployed preview. Use for any edit to firebase.json, .firebaserc, apps/api/Dockerfile or the deploy workflows.
---

# Firebase Hosting

The web app is a static build of `apps/web` (`dist/apps/web/browser`) served by Firebase Hosting. Decisions: `docs/decisions/0002-host-on-firebase.md` and `0003-deploy-the-api-to-cloud-run-with-cloud-sql.md`. Human setup: `docs/deployment.md`.

## Rules

- **Never deploy.** Do not run `firebase deploy`, `firebase hosting:channel:deploy`, `firebase use` or anything that changes the Firebase project. CI deploys: a preview channel per PR, the live site on `main`. If a command would deploy, stop and ask the user.
- Do not add `firebase-tools` or the Firebase JS SDK to `package.json` (hard rule 6). The deploy action ships its own CLI. Using Firebase services from the app (Auth, Storage, ...) needs an ADR first.
- Never commit service account keys or tokens. The project id lives in `.firebaserc` and the `FIREBASE_PROJECT_ID` repo variable; the key lives only in the `FIREBASE_SERVICE_ACCOUNT` secret.
- Keep `/index.html` uncached and hashed assets immutable. Angular's production build hashes file names (`outputHashing: all`), which is what makes the long cache safe.
- The SPA fallback (`"source": "**"` to `/index.html`) must stay the last rewrite. Put new rewrites, such as `/api/**` to Cloud Run, above it.

## Change hosting config

1. Edit `firebase.json` (schema: `$schema` at the top; reference https://firebase.google.com/docs/hosting/full-config).
2. Check it locally when the Firebase CLI is installed (`firebase --version`):
   ```bash
   pnpm nx build web
   firebase emulators:start --only hosting   # http://localhost:5002
   ```
   If the CLI is not installed (cloud sessions), skip this and say so; the PR preview deploy is the check.
3. Open a PR. The `Deploy web` workflow comments a preview URL on it. Check the change there (headers with `curl -I <url>`, routes by loading deep links).

## API on Cloud Run

`apps/api` ships as a container (`apps/api/Dockerfile`, built from `pnpm nx run api:prune`) via `.github/workflows/deploy-api.yml`. Hosting sends `/api/**` to the Cloud Run service `menu-api` in `europe-west1`; the region and service id in `firebase.json` and the workflow must match.

- **Never deploy or touch the database from a session.** No `gcloud run`, `gcloud iam`, `gcloud sql`, `gcloud secrets`, `cloud-sql-proxy` or `prisma migrate deploy` against Cloud SQL. CI does it on `main`.
- The image installs only `apps/api/package.json` dependencies. When the API or one of its libs imports a new package, add it there with the root `package.json` version; `src/runtime-dependencies.spec.ts` fails until you do.
- Check an image change with the pruned build: `pnpm nx run api:prune`, then `pnpm install --prod --frozen-lockfile` and `PORT=8080 node main.js` in a copy of `dist/apps/api`, and `curl localhost:8080/api/health`. CI repeats this with Docker on every PR.
- Migrations run before the new revision; keep them backward compatible with the live code.

## Troubleshooting

- `Deploy web` skipped: `FIREBASE_PROJECT_ID` is not set yet, or the PR comes from a fork. Not a failure.
- Sign-in fails on a preview with `auth/unauthorized-domain`: the `auth-domains` job in `Deploy web` did not run or failed. A `403` there means `github-deployer` lacks the `Auth Domains Editor` role (`docs/deployment.md` section 4).
- 404 on a deep link: the SPA rewrite was removed or shadowed.
- Old UI after deploy: something is caching `index.html`; check the `headers` order and `Cache-Control`.
- Hosting deploy fails on the `/api/**` rewrite: the Cloud Run service `menu-api` does not exist yet (`docs/deployment.md` section 5 creates a placeholder).
- `Deploy API` builds but skips deploy steps: the `CLOUD_SQL_INSTANCE` variable is not set, or it is not a `main` run.
- `Deploy API` fails at authentication on `main`: `GCP_DEPLOY_SERVICE_ACCOUNT` is missing from the `production` environment.
- Container exits with `Cannot find module`: a runtime package is missing from `apps/api/package.json`.
