import { TestBed } from '@angular/core/testing';
import { I18n } from '@menu/web/shared/util-i18n';
import { PriceHistory } from './price-history';

describe('PriceHistory', () => {
  it('draws a bar per month, scaled to the highest price, latest highlighted', async () => {
    TestBed.inject(I18n).setLanguage('en');
    const fixture = TestBed.createComponent(PriceHistory);
    fixture.componentRef.setInput('points', [
      { month: '2026-08', averagePrice: { value: 60, currency: 'ILS' as const }, count: 3 },
      { month: '2026-09', averagePrice: { value: 80, currency: 'ILS' as const }, count: 4 },
    ]);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const bars = [...element.querySelectorAll<HTMLElement>('.bar')];
    expect(bars.map((bar) => bar.style.height)).toEqual(['75%', '100%']);
    expect(element.querySelector('.latest .price')?.textContent).toBe('₪80');
    expect(element.querySelector('.month')?.textContent).toBe('Aug');
  });
});
