import { TestBed } from '@angular/core/testing';
import { DistancePipe, PricePipe, RelativeDatePipe, ShekelsPipe } from './format.pipes';
import { I18n } from './i18n';

describe('format pipes', () => {
  beforeEach(() => {
    TestBed.inject(I18n).setLanguage('he');
  });

  function create<T>(type: new () => T): T {
    return TestBed.runInInjectionContext(() => new type());
  }

  it('shows shekels and prices', () => {
    expect(new ShekelsPipe().transform(68)).toBe('₪68');
    expect(new PricePipe().transform({ value: 68.5, currency: 'ILS' as const })).toBe('₪68.50');
  });

  it('shows a distance in the current language', () => {
    const pipe = create(DistancePipe);
    expect(pipe.transform(1234)).toBe('1.2 ק״מ');
    TestBed.inject(I18n).setLanguage('en');
    expect(pipe.transform(1234)).toBe('1.2 km');
  });

  it('shows a date relative to today', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(create(RelativeDatePipe).transform(yesterday)).toBe('אתמול');
  });
});
