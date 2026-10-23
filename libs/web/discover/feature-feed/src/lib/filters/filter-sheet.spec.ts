import { TestBed } from '@angular/core/testing';
import { FeedStore } from '@menu/web/discover/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { boundaries } from '../testing/feed-fixtures';
import { FilterSheet } from './filter-sheet';

describe('FilterSheet', () => {
  const tag = {
    id: '9a1d3c4e-3333-4c1c-9a57-6f7a5d3c2b10',
    slug: 'hamburger',
    name: { he: 'המבורגר', en: 'Hamburger' },
    kind: 'dish' as const,
  };

  async function render() {
    const feed = vi.fn().mockResolvedValue({ items: [], nextOffset: null });
    TestBed.configureTestingModule({
      providers: boundaries({ feed, tags: vi.fn().mockResolvedValue([tag]) }),
    });
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(FilterSheet);
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(
        (fixture.nativeElement as HTMLElement).querySelector('mat-chip-option'),
      ).not.toBeNull();
    });
    return { fixture, element: fixture.nativeElement as HTMLElement, feed, closed };
  }

  it('applies the chosen tag and order to the feed', async () => {
    const { fixture, element, feed, closed } = await render();
    element.querySelector<HTMLElement>('mat-chip-option .mdc-evolution-chip__action')?.click();
    [...element.querySelectorAll('mat-button-toggle button')][2]?.dispatchEvent(new Event('click'));
    fixture.detectChanges();
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(feed).toHaveBeenCalledWith(
      expect.objectContaining({ tagIds: [tag.id], sort: 'price', offset: 0 }),
    );
    expect(TestBed.inject(FeedStore).primaryTag()).toEqual(tag);
    expect(closed).toHaveBeenCalled();
  });

  it('resets to the defaults', async () => {
    const { fixture, element, feed } = await render();
    await TestBed.inject(FeedStore).setFilters({ radiusKm: 25 });
    [...element.querySelectorAll('button')].find((b) => b.textContent.includes('איפוס'))?.click();
    fixture.detectChanges();
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(feed).toHaveBeenLastCalledWith(expect.objectContaining({ radiusKm: 5, tagIds: [] }));
  });
});
