import { TestBed } from '@angular/core/testing';
import { classic, classicReport, loadedStore, menuApi } from '../testing/manage-fixtures';
import { ReportedItems } from './reported-items';

describe('ReportedItems', () => {
  async function render(overrides: Parameters<typeof menuApi>[0] = {}) {
    await loadedStore(
      menuApi({ itemReports: () => Promise.resolve([classicReport]), ...overrides }),
    );
    const fixture = TestBed.createComponent(ReportedItems);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const click = async (selector: string) => {
      const found = element.querySelector<HTMLButtonElement>(selector);
      if (!found) {
        throw new Error(`No ${selector}`);
      }
      found.click();
      await fixture.whenStable();
    };
    return { element, click };
  }

  it('lists reported items with what diners said, naming no one', async () => {
    const { element } = await render();
    const card = element.querySelector('li.card');
    expect(card?.querySelector('h3')?.textContent).toBe('קלאסי');
    expect(card?.querySelector('.gone')?.textContent).toContain('2 דיווחו שכבר לא מגישים');
    expect(card?.querySelector('.price')?.textContent).toContain('דיווח אחד על מחיר חדש: ₪68');
    expect(card?.querySelector('.price')?.textContent).toContain('בתפריט: ₪62');
  });

  it('shows nothing when there are no reports', async () => {
    const { element } = await render({ itemReports: () => Promise.resolve([]) });
    expect(element.querySelector('h2')).toBeNull();
    expect(element.querySelector('li')).toBeNull();
  });

  it('confirms the item is still served', async () => {
    const confirmItem = vi.fn().mockResolvedValue(undefined);
    const { element, click } = await render({ confirmItem });
    await click('button.confirm');
    expect(confirmItem).toHaveBeenCalledWith(classic.id);
    expect(element.querySelector('li.card')).toBeNull();
  });

  it('sets the reported price', async () => {
    const updateItem = vi
      .fn()
      .mockResolvedValue({ ...classic, listPrice: { value: 68, currency: 'ILS' } });
    const { click } = await render({ updateItem });
    await click('button.set-price');
    expect(updateItem).toHaveBeenCalledWith(classic.id, {
      listPrice: { value: 68, currency: 'ILS' },
    });
  });

  it('archives the item after a second tap', async () => {
    const decide = vi.fn().mockResolvedValue({ ...classic, state: 'archived' });
    const { element, click } = await render({ decide });
    await click('button.archive');
    expect(decide).not.toHaveBeenCalled();
    expect(element.querySelector('button.archive')?.textContent).toContain('להוציא?');
    await click('button.archive');
    expect(decide).toHaveBeenCalledWith(classic.id, 'archive');
  });

  it('keeps the item and says so when an action fails', async () => {
    const { element, click } = await render({
      confirmItem: vi.fn().mockRejectedValue(new Error('offline')),
    });
    await click('button.confirm');
    expect(element.querySelector('li.card')).not.toBeNull();
    expect(element.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('links to editing the item for anything else', async () => {
    const { element } = await render();
    expect(element.querySelector('a.edit')?.getAttribute('href')).toBe(
      `/manage/venues/${classic.venueId}/items/${classic.id}`,
    );
  });
});
