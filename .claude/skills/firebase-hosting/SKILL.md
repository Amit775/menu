---
name: firebase-hosting
description: Change how the web app is served on Firebase Hosting (rewrites, redirects, headers, caching, preview channels) or check a deployed preview. Use for any edit to firebase.json, .firebaserc or the deploy workflow.
---

# Firebase Hosting

The web app is a static build of `apps/web` (`dist/apps/web/browser`) served by Firebase Hosting. Decision and reasons: `docs/decisions/0002-host-on-firebase.md`. Human setup: `docs/deployment.md`.

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

## Troubleshooting

- `Deploy web` skipped: `FIREBASE_PROJECT_ID` is not set yet, or the PR comes from a fork. Not a failure.
- 404 on a deep link: the SPA rewrite was removed or shadowed.
- Old UI after deploy: something is caching `index.html`; check the `headers` order and `Cache-Control`.
