# 0005. Runtime translations for Hebrew and English

- Status: accepted
- Date: 2026-10-23

## Context

The app opens in Hebrew (right to left) and must offer English as a full second language (product spec, principles). Users switch language from their profile and expect the switch to apply at once. Angular's built-in `@angular/localize` compiles one bundle per locale, so a switch means a reload into another build, two Hosting deployments and, later, two Capacitor builds. Runtime libraries such as Transloco would add a dependency (ADR 0001).

## Decision

- Translate at runtime with a small workspace lib, `@menu/web/shared/util-i18n`, and no new dependency.
- `I18n` holds the language as a signal (Hebrew by default, remembered per device) and keeps `<html lang dir>` in sync, so layout, Material components and logical CSS properties mirror automatically.
- Each lib keeps its own strings next to its code with `defineMessages({ he, en })` and reads them with `injectMessages()`; the English object must have the same shape as the Hebrew one, so a missing string is a type error.
- Bilingual data from the API (`LocalizedText`) is shown with `I18n.pick()` or the `localize` pipe, falling back to Hebrew when there is no English name.
- Styles use logical properties (`margin-inline-start`, `inset-inline-end`) so one stylesheet serves both directions.

## Consequences

- One build serves both languages, and switching is instant.
- No ICU message extraction or translator tooling; plurals and dates use `Intl` directly. Revisit if a third language or a translation vendor arrives.
- The shell must not import Zod schemas at runtime (it would pull them into the initial bundle); `I18n` checks the stored language by hand.
