import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { OverlayContainer } from '@angular/cdk/overlay';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { type DiscoverApiClient, FeedStore } from '@menu/web/discover/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { LeafletLoader } from '@menu/web/shared/util-map';
import { boundaries, sampleItem } from '../testing/feed-fixtures';
import { DiscoverFeedPage } from './discover-feed-page';

describe('DiscoverFeedPage', () => {
  async function render(api: Partial<DiscoverApiClient>) {
    TestBed.configureTestingModule({
      imports: [DiscoverFeedPage],
      providers: [
        provideRouter([]),
        ...boundaries(api),
        // Leaflet needs a real browser; the map component has its own spec.
        { provide: LeafletLoader, useValue: { load: () => new Promise(() => undefined) } },
      ],
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

  it('opens the filters as a bottom sheet and the search as a dialog', async () => {
    const feed = vi.fn().mockResolvedValue({ items: [], nextOffset: null });
    const { fixture, element } = await render({ feed, venue });
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    element.querySelector<HTMLButtonElement>('button.filter')?.click();
    await fixture.whenStable();
    expect(overlay.querySelector('mat-bottom-sheet-container menu-filter-sheet')).not.toBeNull();
    TestBed.inject(MatBottomSheet).dismiss();
    element.querySelector<HTMLButtonElement>('button[aria-label="חיפוש"]')?.click();
    await fixture.whenStable();
    expect(overlay.querySelector('mat-dialog-container menu-search-panel')).not.toBeNull();
  });

  it('keeps the server’s order when sorting by price', async () => {
    const feed = vi.fn().mockResolvedValue({
      items: [sampleItem(1, { score: null }), sampleItem(2)],
      nextOffset: 20,
    });
    const { fixture, element } = await render({ feed, venue });
    await TestBed.inject(FeedStore).setView('list');
    await TestBed.inject(FeedStore).setFilters({ sort: 'price' });
    await fixture.whenStable();
    const names = [...element.querySelectorAll('menu-item-row .name')].map((name) =>
      name.textContent.trim(),
    );
    expect(names).toEqual(['פריט 1', 'פריט 2']);
    expect(element.querySelector('.divider')).toBeNull();
    expect(element.querySelector('.summary')?.textContent).toContain('2+ פריטים');
  });

  it('loads more reels near the end and remembers the card', async () => {
    const feed = vi
      .fn()
      .mockResolvedValueOnce({ items: [sampleItem(1), sampleItem(2)], nextOffset: 2 })
      .mockResolvedValueOnce({ items: [sampleItem(3)], nextOffset: null });
    const { fixture, element } = await render({ feed, venue });
    const track = element.querySelector<HTMLElement>('.reel-track');
    if (track) {
      Object.defineProperty(track, 'clientWidth', { value: 400 });
      track.scrollLeft = -400;
      track.dispatchEvent(new Event('scroll'));
    }
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelectorAll('menu-reel-card')).toHaveLength(3);
    });
    expect(TestBed.inject(FeedStore).reelIndex()).toBe(1);
  });

  it('shows venues on a map', async () => {
    const feed = vi.fn().mockResolvedValue({ items: [sampleItem(1)], nextOffset: null });
    const map = vi.fn().mockResolvedValue([]);
    const { fixture, element } = await render({ feed, venue, map });
    [...element.querySelectorAll('mat-button-toggle button')][2]?.dispatchEvent(new Event('click'));
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('menu-venue-map')).not.toBeNull();
    });
    expect(map).toHaveBeenCalled();
    expect(element.querySelector('menu-reel-card')).toBeNull();
  });
});
