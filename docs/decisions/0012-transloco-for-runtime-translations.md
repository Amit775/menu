# 0012. Transloco for runtime translations

- Status: accepted
- Date: 2026-10-24
- Supersedes: 0005

## Context

ADR 0005 chose a homegrown `util-i18n` (`defineMessages`, `injectMessages`, a `messages` pipe) to avoid a dependency. Review found it reinvents what a translation library does, with plurals and conditional strings written as TypeScript functions inside the message objects. The user asked for Transloco, used through its signal APIs and modern Angular patterns (standalone, `inject()`, no NgModules or structural directives).

## Decision

- Use `@jsverse/transloco` with `@jsverse/transloco-messageformat` for ICU plurals and selects (`{count, plural, =1 {...} other {# ...}}`).
- `provideI18n()` from `@menu/web/shared/util-i18n` configures it: Hebrew default and fallback, English available, re-render on language change. The app and every web test environment provide it.
- Each lib owns one scope per screen area: `i18n/<name>.he.ts` and `i18n/<name>.en.ts` export the strings (`en` is `satisfies typeof he`, so a missing or extra key fails typecheck), and `<name>.i18n.ts` declares the scope with lazy loaders through `i18nScope()`. Scope names are `<domain><Area>`, for example `entriesLog`.
- Components read strings with `protected readonly t = injectTranslate(scope)` and call `t('key')` or `t('key', { count })` in templates and code. `injectTranslate` is a thin signal wrapper over `TranslocoService`: it loads the scope for the active language, re-renders when the language changes, holds a pending task while loading (so `whenStable()` waits for strings) and types keys from the Hebrew file.
- `I18n` stays as the app's language service: it switches Transloco's active language, remembers it per device and keeps `<html lang dir>` in sync. `localize` (bilingual API data), `distance`, `relativeDate`, `shekels` and `formatMonth` stay in `util-i18n`.

## Consequences

- Strings live in data files with ICU syntax instead of functions, ready for translator tooling later.
- Each scope loads lazily per language with its feature chunk.
- Specs need `provideI18n()`, which each web project's test setup provides.
- ADR 0005's "no dependency" consequence no longer holds; its RTL and logical-CSS decisions stand.
