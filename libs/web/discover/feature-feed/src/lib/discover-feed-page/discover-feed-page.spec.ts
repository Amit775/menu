import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type DiscoverApiClient } from '@menu/web/discover/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { boundaries, sampleItem } from '../testing/feed-fixtures';
import { DiscoverFeedPage } from './discover-feed-page';

describe('DiscoverFeedPage', () => {
  async function render(api: Partial<DiscoverApiClient>) {
    TestBed.configureTestingModule({
      imports: [DiscoverFeedPage],
      providers: [provideRouter([]), ...boundaries(api)],
    });
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(DiscoverFeedPage);
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('mat-spinner')).toBeNull();
    });
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  const venue = vi.fn().mockResolvedValue({ sections: [] });

  it('shows the feed as full-screen reels', async () => {
    const feed = vi
      .fn()
      .mockResolvedValue({ items: [sampleItem(1), sampleItem(2)], nextOffset: null });
    const { element } = await render({ feed, venue });
    const cards = element.querySelectorAll('menu-reel-card h2');
    expect([...cards].map((card) => card.textContent.trim())).toEqual(['פריט 1', 'פריט 2']);
    expect(feed).toHaveBeenCalledWith(expect.objectContaining({ mode: 'reels' }));
  });

  it('lists ranked items first, then the ones without enough ratings', async () => {
    const feed = vi.fn().mockResolvedValue({
      items: [sampleItem(1), sampleItem(2, { score: null })],
      nextOffset: null,
    });
    const { fixture, element } = await render({ feed, venue });
    [...element.querySelectorAll('mat-button-toggle button')][1]?.dispatchEvent(new Event('click'));
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('.divider')?.textContent).toContain('עדיין אין מספיק דירוגים');
    });
    expect(feed).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'list' }));
    expect(element.querySelectorAll('menu-item-row')).toHaveLength(2);
  });

  it('offers to try again when the feed fails', async () => {
    const feed = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [sampleItem(1)], nextOffset: null });
    const { fixture, element } = await render({ feed, venue });
    expect(element.querySelector('[role=alert]')?.textContent).toContain('לא הצלחנו לטעון');
    element.querySelector<HTMLButtonElement>('[role=alert] button')?.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('menu-reel-card')).not.toBeNull();
    });
  });

  it('says when nothing matches', async () => {
    const feed = vi.fn().mockResolvedValue({ items: [], nextOffset: null });
    const { element } = await render({ feed, venue });
    expect(element.querySelector('[role=status]')?.textContent).toContain('אין פריטים');
  });

  it('opens the filters and the search', async () => {
    const feed = vi.fn().mockResolvedValue({ items: [], nextOffset: null });
    const { fixture, element } = await render({ feed, venue });
    element.querySelector<HTMLButtonElement>('button.filter')?.click();
    await fixture.whenStable();
    expect(element.querySelector('menu-filter-sheet')).not.toBeNull();
    element.querySelector<HTMLButtonElement>('button[aria-label="חיפוש"]')?.click();
    await fixture.whenStable();
    expect(element.querySelector('menu-search-panel')).not.toBeNull();
  });
});
