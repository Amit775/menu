import { computed, inject, type Signal } from '@angular/core';
import { type Language } from '@menu/shared/contracts';
import { I18n } from './i18n';

/** UI strings for one lib, in every language. The English shape must match the Hebrew one. */
export type Messages<T> = Record<Language, T>;

export function defineMessages<T>(messages: Messages<T>): Messages<T> {
  return messages;
}

/**
 * The lib's strings in the current language, as a signal: `t().title` in templates.
 * Call in an injection context (a field initializer of a component).
 */
export function injectMessages<T>(messages: Messages<T>): Signal<T> {
  const i18n = inject(I18n);
  return computed(() => messages[i18n.language()]);
}
