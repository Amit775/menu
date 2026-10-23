import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type DiscoverApiClient, FeedStore } from '@menu/web/discover/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { boundaries, sampleItem, VENUE_ID } from '../testing/feed-fixtures';
import { SearchPanel } from './search-panel';

describe('SearchPanel', () => {
  const tag = {
    id: '9a1d3c4e-3333-4c1c-9a57-6f7a5d3c2b10',
    slug: 'hamburger',
    name: { he: 'המבורגר' },
    kind: 'dish' as const,
  };

  async function render(search: DiscoverApiClient['search']) {
    const feed = vi.fn().mockResolvedValue({ items: [], nextOffset: null });
    TestBed.configureTestingModule({
      providers: [provideRouter([]), ...boundaries({ search, feed })],
    });
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(SearchPanel);
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const input = element.querySelector('input');
    if (input) {
      input.value = 'בורגר';
      input.dispatchEvent(new Event('input'));
    }
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('[role=alert], [role=status], h3, mat-chip')).not.toBeNull();
    });
    return { fixture, element, feed, closed };
  }

  it('finds items, venues and tags as the user types', async () => {
    const search = vi.fn().mockResolvedValue({
      items: [sampleItem(1)],
      venues: [{ id: VENUE_ID, name: { he: 'מוזס' } }],
      tags: [tag],
    });
    const { element } = await render(search);
    expect(search).toHaveBeenCalledWith('בורגר');
    expect(element.querySelector('menu-item-row')).not.toBeNull();
    expect(element.querySelector('ul a')?.getAttribute('href')).toBe(`/venues/${VENUE_ID}`);
  });

  it('filters the feed by a tag it found', async () => {
    const search = vi.fn().mockResolvedValue({ items: [], venues: [], tags: [tag] });
    const { fixture, element, feed, closed } = await render(search);
    element.querySelector<HTMLElement>('mat-chip')?.click();
    await fixture.whenStable();
    expect(TestBed.inject(FeedStore).filters().tagIds).toEqual([tag.id]);
    expect(feed).toHaveBeenCalled();
    expect(closed).toHaveBeenCalled();
  });

  it('says when nothing was found, and when search fails', async () => {
    const { element } = await render(
      vi.fn().mockResolvedValue({ items: [], venues: [], tags: [] }),
    );
    expect(element.querySelector('[role=status]')?.textContent).toContain('לא מצאנו');
    TestBed.resetTestingModule();
    const failed = await render(vi.fn().mockRejectedValue(new Error('offline')));
    expect(failed.element.querySelector('[role=alert]')?.textContent).toContain('החיפוש לא הצליח');
  });
});
