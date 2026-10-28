import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type PersonalStats } from '@menu/shared/contracts';
import { I18n } from '@menu/web/shared/util-i18n';
import { PersonalStatsCard } from './personal-stats-card';

describe('PersonalStatsCard', () => {
  const burger = {
    id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'המבורגר הקלאסי', en: 'Classic burger' },
    listPrice: null,
    variations: [],
    venue: { id: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10', name: { he: 'בורגר 24', en: null } },
  };
  const stats: PersonalStats = {
    entryCount: 7,
    venueCount: 3,
    itemCount: 5,
    averageRating: 4.3,
    months: [
      { month: '2026-09', entryCount: 3, spent: [{ value: 50, currency: 'ILS' }] },
      { month: '2026-10', entryCount: 2, spent: [{ value: 100, currency: 'ILS' }] },
    ],
    topTags: [
      { name: { he: 'בשרי', en: 'Meat' }, count: 4 },
      { name: { he: 'חריף', en: null }, count: 2 },
    ],
    mostOrdered: { item: burger, count: 3 },
  };

  async function render(value: PersonalStats): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(PersonalStatsCard);
    fixture.componentRef.setInput('stats', value);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function numbers(element: HTMLElement): string[] {
    return [...element.querySelectorAll('.numbers > div')].map(
      (row) =>
        `${row.querySelector('dt')?.textContent ?? ''} ${row.querySelector('dd')?.textContent ?? ''}`,
    );
  }

  it('counts this month, all time, places and items, with the average rating', async () => {
    const element = await render(stats);
    expect(numbers(element)).toEqual([
      'החודש 2',
      'סך הכול 7',
      'מקומות 3',
      'פריטים 5',
      'דירוג ממוצע ★ 4.3',
    ]);
  });

  it('draws spending per month against the costliest month', async () => {
    const element = await render(stats);
    const bars = [...element.querySelectorAll<HTMLElement>('.spending li')];
    expect(bars.map((bar) => bar.querySelector<HTMLElement>('.bar')?.style.blockSize)).toEqual([
      '50%',
      '100%',
    ]);
    expect(bars[1]?.querySelector('.amount')?.textContent).toBe('₪100');
    expect(bars[1]?.querySelector('.month')?.textContent).toContain('אוק');
  });

  it('leaves out spending, tags and the favourite when there are none', async () => {
    const element = await render({
      ...stats,
      averageRating: null,
      months: stats.months.map((month) => ({ ...month, spent: [] })),
      topTags: [],
      mostOrdered: null,
    });
    expect(numbers(element)).toHaveLength(4);
    expect(element.querySelector('.spending')).toBeNull();
    expect(element.querySelector('.tags')).toBeNull();
    expect(element.querySelector('.favourite')).toBeNull();
  });

  it('names the top tags and links the item ordered most', async () => {
    const element = await render(stats);
    expect([...element.querySelectorAll('.tags li')].map((tag) => tag.textContent.trim())).toEqual([
      'בשרי · 4',
      'חריף · 2',
    ]);
    const favourite = element.querySelector('.favourite a');
    expect(favourite?.getAttribute('href')).toBe(`/items/${burger.id}`);
    expect(element.querySelector('.favourite')?.textContent).toContain('המבורגר הקלאסי');
    expect(element.querySelector('.favourite')?.textContent).toContain('בבורגר 24, 3 פעמים');
  });
});
