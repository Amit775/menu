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
- Root services use `@Service()`, never `@Injectable({ providedIn: 'root' })`. `@Injectable()` without `providedIn` is only for services a component provides itself.
- Use native control flow (`@if`, `@for` with `track`, `@switch`), not `*ngIf`/`*ngFor`.
- Bind `[class.x]` / `[style.x]`, not `ngClass` / `ngStyle`. Use `NgOptimizedImage` for static images.
- Keep templates logic-free: derive with `computed()` in the class.
- Forms use Signal Forms (`@angular/forms/signals`: `form()`, `[formField]`, validators in the schema). A form that edits loaded data keeps its model in a `linkedSignal` over that data, so it resets when the data changes. Name the form (`form(model, schema, { name: 'item' })`) and focus the first invalid field with `focusBoundControl()` on submit.

## State

- NgRx Signal Store (`@ngrx/signals`) for feature state, one store per resource, in `data-access` libs. Generate with `data-access-lib`.
- A store loads through a `resource()` it owns. The page hands it a signal source once, from its constructor (`store.load(this.id)` or `store.load(() => ...)`), and the resource refetches when that source changes. Expose `status` with `loadStatus()` from `@menu/web/shared/util-data` and offer `reload()` for retry. Mutations write the result back with `resource.set()` / `update()`.
- Local component state uses `signal()`, `computed()` and `linkedSignal()`. Never mutate signal values in place; use `set` / `update`.
- Validate every HTTP response with the Zod schema from `@menu/shared/contracts`.

## No `effect()`

Do not use `effect()` (or `afterRenderEffect()`), in a constructor or anywhere else, unless the user approves that specific use. Effects hide data flow and run at times that are hard to test. Instead:

- Derived values: `computed()`. State that resets when its source changes: `linkedSignal()`.
- Loading when an input or route param changes: a store `resource()` keyed on that signal (see State).
- Reacting to events from another domain: `DataChanges.on(topic)` from `@menu/web/shared/util-events`, or an Observable such as `Auth.userChanges`, subscribed with `takeUntilDestroyed(destroyRef)`.
- Imperative third-party APIs (Leaflet, a DOM focus): `ngOnChanges` for input changes, `afterNextRender({ injector })` for a one-off after the view updates. Pass everything the drawing needs as inputs, translated text included, so a change reaches `ngOnChanges`.

## Text and translation (ADR 0012)

- All UI text goes through Transloco, read with signals: `protected readonly t = injectTranslate(scope)` and `t('key')` / `t('key', { count })` in the template or class. Never the `transloco` pipe, structural directive or `TranslocoModule`: those are older patterns.
- Each lib owns a scope per screen area: `<area>.i18n.ts` declares it with `i18nScope('<domain><Area>', loaders)`, and `i18n/<area>.he.ts` / `i18n/<area>.en.ts` export `he` and `en` (`en` is `satisfies typeof he`). `feature-lib` generates them.
- Plurals and conditional text use ICU in the string (`{count, plural, =1 {...} other {# ...}}`, `{kind, select, ...}`), never string building in code.
- Bilingual data from the API goes through the `localize` pipe or `I18n.pick()`; numbers, dates and prices through the `util-i18n` format pipes.
- Specs wait for strings with `fixture.whenStable()` (scope loads hold a pending task).

## Lib types

- `feature-*`: routed pages; inject stores; compose `ui` components.
- `ui`: presentational only. Inputs and outputs, no injected services, no HTTP. Text comes through `injectTranslate` and the `util-i18n` pipes (`localize`, `distance`, `shekels`, `relativeDate`), which follow the current language; that is the one service a `ui` component reaches.
- `data-access`: stores and API clients. No components.

## UI

- Angular Material 3 components, themed in `apps/web/src/styles.scss` with `mat.theme`. Use `--mat-sys-*` tokens, not hard-coded colors.
- Meet WCAG AA: labels on inputs, buttons have `type`, images have `alt`.

## Platform safety (SSR and Capacitor later)

- Never touch `window`, `document`, `localStorage` or `navigator` directly (lint-enforced). Inject `DOCUMENT`, use `isPlatformBrowser`, or wrap the API behind an injectable.
