---
paths:
  - 'apps/web/**'
  - 'libs/web/**'
---

# Angular (v22, zoneless)

Follow Angular's current best practices (use the `angular-cli` MCP `get_best_practices` tool when unsure). Most of these are lint rules already; the reason is given so you can apply the intent where no rule exists.

## Components

- Standalone only. Do not set `standalone: true` (it is the default) and never create NgModules.
- `changeDetection: ChangeDetectionStrategy.OnPush` on every component. The app is zoneless; OnPush plus signals is how views update.
- Use `input()`, `output()`, `model()` and `viewChild()` signal APIs, not decorators.
- Use `inject()`, not constructor injection. It works in functions, stores and guards alike.
- Use native control flow (`@if`, `@for` with `track`, `@switch`), not `*ngIf`/`*ngFor`.
- Bind `[class.x]` / `[style.x]`, not `ngClass` / `ngStyle`. Use `NgOptimizedImage` for static images.
- Keep templates logic-free: derive with `computed()` in the class.
- Prefer Reactive Forms (or signal forms once stable) over template-driven forms.

## State

- NgRx Signal Store (`@ngrx/signals`) for feature state, one store per resource, in `data-access` libs. Generate with `data-access-lib`.
- Local component state uses `signal()` / `computed()`. Never mutate signal values in place; use `set` / `update`.
- Validate every HTTP response with the Zod schema from `@menu/shared/contracts`.

## Lib types

- `feature-*`: routed pages; inject stores; compose `ui` components.
- `ui`: presentational only. Inputs and outputs, no injected services, no HTTP. Text comes through the `util-i18n` pipes (`localize`, `messages`, `distance`, `shekels`), which follow the current language; that is the one service a `ui` component reaches.
- `data-access`: stores and API clients. No components.

## UI

- Angular Material 3 components, themed in `apps/web/src/styles.scss` with `mat.theme`. Use `--mat-sys-*` tokens, not hard-coded colors.
- Meet WCAG AA: labels on inputs, buttons have `type`, images have `alt`.

## Platform safety (SSR and Capacitor later)

- Never touch `window`, `document`, `localStorage` or `navigator` directly (lint-enforced). Inject `DOCUMENT`, use `isPlatformBrowser`, or wrap the API behind an injectable.
