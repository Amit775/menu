import { TestBed } from '@angular/core/testing';
import { I18n } from './i18n';
import { defineMessages, injectMessages } from './messages';

describe('injectMessages', () => {
  const messages = defineMessages({
    he: { title: 'גילוי' },
    en: { title: 'Discover' },
  });

  it('follows the current language', () => {
    const t = TestBed.runInInjectionContext(() => injectMessages(messages));
    expect(t().title).toBe('גילוי');
    TestBed.inject(I18n).setLanguage('en');
    expect(t().title).toBe('Discover');
  });
});
