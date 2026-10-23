# 0007. Sign in with Firebase Authentication

- Status: accepted
- Date: 2026-10-23

## Context

The product spec settles sign-in as Firebase Authentication with Google and phone number, with no email and password. The web app is on Firebase Hosting and the API on Cloud Run in the same Google Cloud project, `menu-b29eb` (ADR 0002, 0003). The product owner approved the `firebase` and `firebase-admin` packages on 2026-10-23.

## Decision

- **Web**: `firebase` (13.x), used only from `@menu/web/shared/util-auth`.
  - The SDK is imported dynamically on first use, so it stays out of the initial bundle.
  - The web config is read at runtime from Hosting's reserved `/__/firebase/init.json`. No keys live in the repository. In development, `proxy.conf.json` forwards `/__` to the live site.
  - `Auth` exposes the user as signals. `authInterceptor` adds `Authorization: Bearer <ID token>` to `/api/` calls only. `signedInGuard` protects routes.
  - Google uses a popup. Phone sign-in uses an invisible reCAPTCHA and an SMS code in Hebrew.
- **API**: `firebase-admin` (14.x), used only by `FirebaseTokenVerifier` in `@menu/api/shared/util-auth`, behind the existing `TokenVerifier` port.
  - Verifying an ID token needs only the project id (`FIREBASE_PROJECT_ID`, default `menu-b29eb`), not a service account.
  - An invalid or expired token is a 401. A failure to reach Firebase stays a 500.
- **Development and e2e**: `AUTH_DEV_TOKENS=true` swaps in `DevTokenVerifier`, which accepts `dev:<uid>:<name>`. `verifierFromEnv` never picks it when `NODE_ENV=production`.

## Consequences

- Console steps only the owner can do:
  - Enable the Google and Phone providers.
  - Register a web app, so that `init.json` carries its config.
  - Keep `menu-b29eb.web.app` and `localhost` in the authorized domains.
- Capacitor builds later will need the native Firebase plugins or a redirect flow, and their own ADR.
- Account deletion and linking a phone number to a Google account are not handled yet.
