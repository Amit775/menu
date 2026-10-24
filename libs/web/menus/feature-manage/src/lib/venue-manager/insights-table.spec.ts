import { TestBed } from '@angular/core/testing';
import { insights, loadedStore, menuApi } from '../testing/manage-fixtures';
import { InsightsTable } from './insights-table';

describe('InsightsTable', () => {
  async function render(overrides: Parameters<typeof menuApi>[0] = {}): Promise<HTMLElement> {
    await loadedStore(menuApi(overrides));
    const fixture = TestBed.createComponent(InsightsTable);
    const element = fixture.nativeElement as HTMLElement;
    await fixture.whenStable();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('mat-spinner')).toBeNull();
    });
    return element;
  }

  it('sums the public entries, counts other entries from the floor up and names the top item', async () => {
    const element = await render();
    expect(element.querySelector('.public')?.textContent).toBe('5');
    expect(element.querySelector('.other')?.textContent).toBe('3');
    expect(element.querySelector('.top')?.textContent).toBe('קלאסי · 4.5');
  });

  it('shows a row per item, best score first, with "under 3" below the floor', async () => {
    const element = await render();
    const rows = [...element.querySelectorAll('tbody tr')].map((row) =>
      [...row.children].map((cell) => cell.textContent),
    );
    expect(rows).toEqual([
      ['קלאסי', '4.5', '4', '3', '80%'],
      ['בורגר כבש', '—', '1', 'פחות מ-3', '—'],
    ]);
  });

  it('says "under 3" when no item reaches the floor', async () => {
    const below = { items: insights.items.map((row) => ({ ...row, otherEntryCount: null })) };
    const element = await render({ insights: () => Promise.resolve(below) });
    expect(element.querySelector('.other')?.textContent).toBe('פחות מ-3');
  });

  it('offers to try again when insights fail to load', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('500')).mockResolvedValue(insights);
    const element = await render({ insights: load });
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'לא הצלחנו לטעון את התובנות.',
    );
    element.querySelector<HTMLButtonElement>('.retry')?.click();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('.public')?.textContent).toBe('5');
    });
  });
});
