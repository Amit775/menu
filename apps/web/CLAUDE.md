# apps/web

Angular 22 shell: zoneless, standalone, Material 3, client-side SPA. iOS and Android will wrap this app with Capacitor later, and public share routes may get SSR; keep code platform-safe.

- This app only bootstraps and composes: `app.config.ts` (providers), `app.routes.ts` (lazy routes added by `feature-lib`), `app.ts` (layout shell). Features live in `libs/web/<domain>/feature-*`.
- Calls to the API go to `/api/...`; `proxy.conf.json` forwards them to `localhost:3000` in dev.
- Served by Firebase Hosting from `dist/apps/web/browser` (root `firebase.json`); every path falls back to `index.html`. Skill: `firebase-hosting`.
- Theme in `src/styles.scss` (`mat.theme`). Use `--mat-sys-*` tokens in component styles.
- Rules: `.claude/rules/angular.md`. Tests: `pnpm nx test web` (Angular's Vitest builder); e2e in `apps/web-e2e`.
