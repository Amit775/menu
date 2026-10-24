import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { I18n } from '@menu/web/shared/util-i18n';
import { boundaries, sampleItem, VENUE_ID } from '../testing/feed-fixtures';
import { ReelCard } from './reel-card';

describe('ReelCard', () => {
  async function render(share = vi.fn()) {
    const siblings = [sampleItem(1), sampleItem(2), sampleItem(3, { score: null })];
    const venue = vi.fn().mockResolvedValue({ sections: [{ items: siblings }] });
    TestBed.configureTestingModule({
      providers: [provideRouter([]), ...boundaries({ venue }, share)],
    });
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(ReelCard);
    fixture.componentRef.setInput('item', sampleItem(1, { writtenByMe: true }));
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement, venue };
  }

  it('shows the item, its venue, score and price', async () => {
    const { element } = await render();
    expect(element.querySelector('h2')?.textContent.trim()).toBe('פריט 1');
    expect(element.querySelector('.venue')?.textContent).toContain('מוזס');
    expect(element.querySelector('.numbers')?.textContent).toContain('90% יזמינו שוב');
    expect(element.querySelector('.price')?.textContent).toBe('₪68');
    expect(element.querySelector('.flag')?.textContent).toBe('יש לך רשומה');
  });

  it('opens what people say and the log form for the item', async () => {
    const { element } = await render();
    const entries = element.querySelector('.side a.side-item:not(.log)');
    expect(entries?.getAttribute('href')).toBe(`/items/${sampleItem(1).id}/entries`);
    expect(entries?.getAttribute('aria-label')).toBe('מה אומרים: 12 רשומות');
    const log = element.querySelector('a.log');
    expect(log?.getAttribute('href')).toBe(`/log/${sampleItem(1).id}`);
    expect(log?.textContent).toContain('אכלתי');
  });

  it('steps through the venue’s other items from the edges', async () => {
    const { fixture, element, venue } = await render();
    element.querySelector<HTMLButtonElement>('.edge.end')?.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('h2')?.textContent.trim()).toBe('פריט 2');
    });
    expect(venue).toHaveBeenCalledWith(VENUE_ID, null);
    expect(element.querySelectorAll('.dot')).toHaveLength(3);
    expect(element.querySelector('[aria-live]')?.textContent.trim()).toBe('פריט 2 מתוך 3 במוזס');
    element.querySelector<HTMLButtonElement>('.edge.start')?.click();
    element.querySelector<HTMLButtonElement>('.edge.start')?.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('h2')?.textContent.trim()).toBe('פריט 3');
    });
    expect(element.querySelector('.numbers')?.textContent).toContain('עדיין אין ציון');
  });

  it('opens the venue on a swipe up', async () => {
    const { element } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const article = element.querySelector('article');
    article?.dispatchEvent(new PointerEvent('pointerdown', { clientX: 100, clientY: 500 }));
    article?.dispatchEvent(new PointerEvent('pointerup', { clientX: 110, clientY: 300 }));
    expect(navigate).toHaveBeenCalledWith(['/venues', VENUE_ID]);
  });

  it('does not also step through items when a swipe up ends on an edge', async () => {
    const { fixture, element, venue } = await render();
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const edge = element.querySelector<HTMLButtonElement>('.edge.end');
    edge?.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 500 }),
    );
    edge?.dispatchEvent(
      new PointerEvent('pointerup', { bubbles: true, clientX: 300, clientY: 300 }),
    );
    edge?.click();
    await fixture.whenStable();
    expect(venue).not.toHaveBeenCalled();
  });

  it('ignores a sideways swipe, which moves the feed', async () => {
    const { element } = await render();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const article = element.querySelector('article');
    article?.dispatchEvent(new PointerEvent('pointerdown', { clientX: 300, clientY: 500 }));
    article?.dispatchEvent(new PointerEvent('pointerup', { clientX: 50, clientY: 450 }));
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shares a link to the item and says when it was copied', async () => {
    const share = vi.fn().mockResolvedValue('copied');
    const { fixture, element } = await render(share);
    [...element.querySelectorAll('button')].find((b) => b.textContent.includes('שיתוף'))?.click();
    await fixture.whenStable();
    expect(share).toHaveBeenCalledWith(`/items/${sampleItem(1).id}`, 'פריט 1');
    expect(element.querySelector('[role=status]')?.textContent).toBe('הקישור הועתק');
  });
});
