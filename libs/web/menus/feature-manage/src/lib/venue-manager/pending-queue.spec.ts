import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Item } from '@menu/shared/contracts';
import { classic, lamb, loadedStore, menuApi } from '../testing/manage-fixtures';
import { PendingQueue } from './pending-queue';

describe('PendingQueue', () => {
  async function render(overrides: Parameters<typeof menuApi>[0] = {}): Promise<HTMLElement> {
    await loadedStore(menuApi(overrides));
    const fixture = TestBed.createComponent(PendingQueue);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    await TestBed.inject(DOCUMENT).defaultView?.Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve));
  }

  function button(element: HTMLElement, selector: string): HTMLButtonElement {
    const found = element.querySelector<HTMLButtonElement>(selector);
    if (!found) {
      throw new Error(`No ${selector}`);
    }
    return found;
  }

  it('shows the pending item only: its section, price and tags', async () => {
    const element = await render();
    const cards = element.querySelectorAll('li.card');
    expect(cards).toHaveLength(1);
    expect(cards[0]?.querySelector('h3')?.textContent).toBe('בורגר כבש');
    expect(cards[0]?.querySelector('.facts')?.textContent).toBe('עיקריות · ₪72 · תגיות: המבורגר');
  });

  it('says so when nothing waits', async () => {
    const element = await render({ items: () => Promise.resolve([classic]) });
    expect(element.querySelector('.empty')?.textContent).toBe('אין פריטים שממתינים לאישור.');
  });

  it('approves an item, which leaves the queue', async () => {
    const decide = vi.fn().mockResolvedValue({ ...lamb, state: 'approved' } satisfies Item);
    const element = await render({ decide });
    button(element, '.approve').click();
    await vi.waitFor(() => {
      expect(element.querySelector('.empty')).not.toBeNull();
    });
    expect(decide).toHaveBeenCalledWith(lamb.id, 'approve');
  });

  it('asks for a second tap before rejecting', async () => {
    const decide = vi.fn().mockResolvedValue({ ...lamb, state: 'rejected' } satisfies Item);
    const element = await render({ decide });
    button(element, '.reject').click();
    await settle();
    TestBed.tick();
    expect(decide).not.toHaveBeenCalled();
    expect(button(element, '.reject').textContent.trim()).toBe('לדחות?');
    expect(element.querySelector('.hint')?.textContent.trim()).toContain('לחצו שוב לאישור');
    button(element, '.reject').click();
    await vi.waitFor(() => {
      expect(decide).toHaveBeenCalledWith(lamb.id, 'reject');
    });
  });

  it('merges into the approved item the Owner picks', async () => {
    const merge = vi.fn().mockResolvedValue({ ...lamb, state: 'merged', mergedIntoId: classic.id });
    const element = await render({ merge });
    button(element, '.merge-start').click();
    TestBed.tick();
    expect(button(element, '.confirm-merge').disabled).toBe(true);
    element.querySelector<HTMLElement>('.mat-mdc-select-trigger')?.click();
    TestBed.tick();
    const option = TestBed.inject(DOCUMENT).querySelector<HTMLElement>('mat-option');
    expect(option?.textContent.trim()).toBe('קלאסי');
    option?.click();
    TestBed.tick();
    button(element, '.confirm-merge').click();
    await vi.waitFor(() => {
      expect(merge).toHaveBeenCalledWith(lamb.id, classic.id);
    });
  });

  it('says so when a decision fails, and keeps the item', async () => {
    const element = await render({ decide: vi.fn().mockRejectedValue(new Error('403')) });
    button(element, '.approve').click();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('[role="alert"]')?.textContent).toBe(
        'הפעולה לא הצליחה. נסו שוב.',
      );
    });
    expect(element.querySelectorAll('li.card')).toHaveLength(1);
  });

  it('keeps each item busy until its own decision returns', async () => {
    const onions = {
      ...lamb,
      id: '7c1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
      name: { he: 'טבעות בצל', en: null },
    };
    const answers = new Map<string, (value: Item) => void>();
    const decide = vi.fn((id: string) => new Promise<Item>((resolve) => answers.set(id, resolve)));
    const element = await render({ items: () => Promise.resolve([classic, lamb, onions]), decide });
    const approves = (): HTMLButtonElement[] => [
      ...element.querySelectorAll<HTMLButtonElement>('.approve'),
    ];
    approves()[0]?.click();
    approves()[1]?.click();
    answers.get(lamb.id)?.({ ...lamb, state: 'approved' });
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelectorAll('li.card')).toHaveLength(1);
    });
    expect(approves()[0]?.disabled).toBe(true);
  });
});
