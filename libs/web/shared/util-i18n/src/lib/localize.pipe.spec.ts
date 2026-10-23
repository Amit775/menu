import { TestBed } from '@angular/core/testing';
import { I18n } from './i18n';
import { LocalizePipe } from './localize.pipe';

describe('LocalizePipe', () => {
  it('shows a bilingual name in the current language', () => {
    const pipe = TestBed.runInInjectionContext(() => new LocalizePipe());
    expect(pipe.transform({ he: 'צ׳יפס', en: 'Fries' })).toBe('צ׳יפס');
    TestBed.inject(I18n).setLanguage('en');
    expect(pipe.transform({ he: 'צ׳יפס', en: 'Fries' })).toBe('Fries');
  });
});
