import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { type Language, type LocalizedText } from '@menu/shared/contracts';
import { BrowserStorage } from './browser-storage';

const STORAGE_KEY = 'menu.language';

/**
 * The current language. Hebrew (right to left) by default, English at runtime,
 * remembered per device. Keeps `<html lang dir>` in sync so the whole app,
 * Material included, mirrors itself.
 */
@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly storage = inject(BrowserStorage);
  private readonly current = signal<Language>(this.restore());

  readonly language = this.current.asReadonly();
  readonly dir = computed(() => (this.current() === 'he' ? 'rtl' : 'ltr'));

  constructor() {
    const html = inject(DOCUMENT).documentElement;
    effect(() => {
      html.lang = this.current();
      html.dir = this.dir();
    });
  }

  setLanguage(language: Language): void {
    this.current.set(language);
    this.storage.set(STORAGE_KEY, language);
  }

  /** The name in the current language, falling back to Hebrew. */
  pick(text: LocalizedText): string {
    return this.current() === 'en' ? (text.en ?? text.he) : text.he;
  }

  private restore(): Language {
    // A plain check, not LanguageSchema: the shell must not pull Zod into the initial bundle.
    const stored = this.storage.get(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'he';
  }
}
