import { TestBed } from '@angular/core/testing';
import { type ItemHistoryEvent } from '@menu/shared/contracts';
import { I18n } from '@menu/web/shared/util-i18n';
import { ItemHistory } from './item-history';

describe('ItemHistory', () => {
  const events: ItemHistoryEvent[] = [
    { kind: 'archived', at: '2026-10-20T10:00:00.000Z' },
    {
      kind: 'changed',
      at: '2026-09-10T10:00:00.000Z',
      changes: [
        {
          field: 'listPrice',
          from: { value: 58, currency: 'ILS' },
          to: { value: 64, currency: 'ILS' },
        },
        { field: 'name', from: { he: 'בורגר', en: 'Burger' }, to: { he: 'המבורגר', en: null } },
        { field: 'section', from: null, to: { he: 'עיקריות', en: 'Mains' } },
        {
          field: 'tags',
          added: [
            { he: 'טבעוני', en: 'Vegan' },
            { he: 'חריף', en: 'Spicy' },
          ],
          removed: [{ he: 'בשרי', en: 'Meat' }],
        },
        { field: 'description' },
      ],
    },
    { kind: 'added', at: '2026-03-01T10:00:00.000Z', listPrice: { value: 58, currency: 'ILS' } },
  ];

  async function render(language: 'he' | 'en') {
    TestBed.inject(I18n).setLanguage(language);
    const fixture = TestBed.createComponent(ItemHistory);
    fixture.componentRef.setInput('events', events);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function lines(element: HTMLElement): string[] {
    return [...element.querySelectorAll('li p')].map((line) => line.textContent.trim());
  }

  it('lists each change in words, newest first, with its month', async () => {
    const element = await render('en');
    expect(element.querySelector('h2')?.textContent).toBe('History');
    expect([...element.querySelectorAll('time')].map((time) => time.textContent)).toEqual([
      'Oct 2026',
      'Sep 2026',
      'Mar 2026',
    ]);
    expect(lines(element)).toEqual([
      'Taken off the menu',
      'Price changed from ₪58 to ₪64',
      'Renamed from Burger',
      'Moved to Mains',
      'Tagged Vegan and Spicy',
      'No longer tagged Meat',
      'Description updated',
      'Added to the menu at ₪58',
    ]);
    expect(element.querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-10-20T10:00:00.000Z',
    );
  });

  it('speaks Hebrew by default', async () => {
    const element = await render('he');
    expect(element.querySelector('h2')?.textContent).toBe('היסטוריה');
    expect(lines(element)[0]).toBe('ירד מהתפריט');
  });
});
