import { DOCUMENT } from '@angular/common';
import { computed, inject, Service } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { type Language, type Text } from '@menu/shared/contracts';
import { BrowserStorage } from './browser-storage';

const STORAGE_KEY = 'menu.language';

@Service()
export class I18n {
  private readonly transloco = inject(TranslocoService);
  private readonly storage = inject(BrowserStorage);
  private readonly html = inject(DOCUMENT).documentElement;

  readonly language = computed<Language>(() =>
    this.transloco.activeLang() === 'en' ? 'en' : 'he',
  );
  readonly dir = computed(() => (this.language() === 'he' ? 'rtl' : 'ltr'));

  constructor() {
    this.apply(this.storage.get(STORAGE_KEY) === 'en' ? 'en' : 'he');
  }

  setLanguage(language: Language): void {
    this.apply(language);
    this.storage.set(STORAGE_KEY, language);
  }

  pick(text: Text): string {
    return this.language() === 'en' ? (text.en ?? text.he) : text.he;
  }

  private apply(language: Language): void {
    this.transloco.setActiveLang(language);
    this.html.lang = language;
    this.html.dir = language === 'he' ? 'rtl' : 'ltr';
  }
}
