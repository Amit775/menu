import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BrowserStorage } from './browser-storage';
import { I18n } from './i18n';

describe('I18n', () => {
  function setup(stored: string | null = null): {
    i18n: I18n;
    set: (key: string, value: string) => void;
  } {
    const values = new Map<string, string>(stored ? [['menu.language', stored]] : []);
    const set = vi.fn((key: string, value: string) => values.set(key, value));
    const storage: Pick<BrowserStorage, 'get' | 'set'> = {
      get: (key) => values.get(key) ?? null,
      set,
    };
    TestBed.configureTestingModule({ providers: [{ provide: BrowserStorage, useValue: storage }] });
    return { i18n: TestBed.inject(I18n), set };
  }

  it('starts in Hebrew, right to left', () => {
    const { i18n } = setup();
    expect(i18n.language()).toBe('he');
    expect(i18n.dir()).toBe('rtl');
  });

  it('restores the language chosen on this device', () => {
    expect(setup('en').i18n.language()).toBe('en');
  });

  it('ignores an unknown stored language', () => {
    expect(setup('fr').i18n.language()).toBe('he');
  });

  it('switches to English, remembers it and updates the document', () => {
    const { i18n, set } = setup();
    i18n.setLanguage('en');
    TestBed.tick();
    const html = TestBed.inject(DOCUMENT).documentElement;
    expect(html.lang).toBe('en');
    expect(html.dir).toBe('ltr');
    expect(set).toHaveBeenCalledWith('menu.language', 'en');
  });

  it('picks the English name and falls back to Hebrew', () => {
    const { i18n } = setup('en');
    expect(i18n.pick({ he: 'סלט', en: 'Salad' })).toBe('Salad');
    expect(i18n.pick({ he: 'סלט' })).toBe('סלט');
  });
});
