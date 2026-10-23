# 0002. Host on Firebase

- Status: accepted
- Date: 2026-10-23

## Context

The web app needs a home with HTTPS, a CDN, SPA fallback routing and per-PR previews. Mobile (Capacitor) will come later and may use other Firebase services. ADR 0001 fixes the stack (Angular SPA, NestJS, Postgres via Prisma) and rules out adding dependencies casually.

## Decision

- Serve `apps/web` from **Firebase Hosting**. `firebase.json` at the repo root points at `dist/apps/web/browser`, rewrites every path to `index.html`, caches hashed assets for a year and never caches `index.html`.
- Deploy from GitHub Actions only (`.github/workflows/deploy-web.yml`) with `FirebaseExtended/action-hosting-deploy`: a preview channel per pull request (expires after 7 days) and the live channel on `main`. The action brings its own Firebase CLI, so `firebase-tools` is **not** a workspace dependency.
- The project id and service account are configuration, not code: repository variable `FIREBASE_PROJECT_ID`, repository secret `FIREBASE_SERVICE_ACCOUNT`. `.firebaserc` holds the id only for local CLI use. The workflow is skipped while the variable is unset.
- Agents never run `firebase deploy` or change Firebase project settings; they change `firebase.json` and let CI deploy. Procedure in the `firebase-hosting` skill.

## API and database

- Run `apps/api` as a container on **Cloud Run** in the same Google Cloud project, reached through a Hosting rewrite (`/api/**` to the Cloud Run service, above the SPA fallback), so the web app keeps calling same-origin `/api` with no CORS.
- Run Postgres on **Cloud SQL for PostgreSQL** in the same project; Cloud Run connects through the Cloud SQL connection, with credentials in Secret Manager.
- Both need the Blaze plan. A serverless Postgres such as Neon was cheaper to start but adds a second vendor. Firebase Data Connect and Cloud Functions were set aside because they would replace Prisma and the Nest app model fixed in ADR 0001.
- Wiring (Dockerfile, deploy workflow, rewrite) lands in a follow-up PR.

## Consequences

- PRs get a preview URL as a comment, so reviewers and agents can check UI changes in a real deployment.
- Hosting adds no runtime dependency to the app; switching hosts later means replacing `firebase.json` and one workflow.
- A security header change or a new rewrite is a `firebase.json` edit reviewed in a PR, then deployed by CI.
