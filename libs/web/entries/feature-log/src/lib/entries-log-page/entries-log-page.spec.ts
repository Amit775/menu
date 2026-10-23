import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { type Entry, type ItemEntries } from '@menu/shared/contracts';
import { EntryApiClient, LastVisibility } from '@menu/web/entries/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { EntriesLogPage } from './entries-log-page';

const ITEM_ID = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
const entry: Entry = {
  id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  itemId: ITEM_ID,
  venueId: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10',
  eatenAt: '2026-10-20T19:30:00.000Z',
  rating: 4,
  wouldOrderAgain: false,
  pricePaid: 6200,
  text: 'קצת יבש',
  visibility: 'public',
  shareToken: 'abcdefghijklmnopqrstuv',
  hidden: false,
  createdAt: '2026-10-20T20:00:00.000Z',
  updatedAt: '2026-10-20T20:00:00.000Z',
};
const sheet: ItemEntries = {
  item: {
    id: ITEM_ID,
    name: { he: 'המבורגר הקלאסי' },
    listPrice: 6800,
    venue: { id: entry.venueId, name: { he: 'בורגר 24' } },
  },
  mine: [entry],
  others: [],
};

describe('EntriesLogPage', () => {
  async function open(url: string, api: Partial<EntryApiClient>, lastVisibility = 'private') {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'log/:itemId', component: EntriesLogPage },
            { path: 'log/:itemId/:entryId', component: EntriesLogPage },
            { path: '**', children: [] },
          ],
          withComponentInputBinding(),
        ),
        {
          provide: EntryApiClient,
          useValue: { forItem: vi.fn().mockResolvedValue(sheet), ...api },
        },
        { provide: LastVisibility, useValue: { get: () => lastVisibility, set: vi.fn() } },
      ],
    });
    TestBed.inject(I18n).setLanguage('he');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, EntriesLogPage);
    await harness.fixture.whenStable();
    const element = harness.routeNativeElement;
    if (!element) {
      throw new Error('The page did not render.');
    }
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(element.querySelector('mat-spinner')).toBeNull();
    });
    const field = (selector: string): HTMLElement => {
      const found = element.querySelector<HTMLElement>(selector);
      if (!found) {
        throw new Error(`No ${selector}`);
      }
      return found;
    };
    return { harness, element, field };
  }

  function star(element: HTMLElement, rating: number): void {
    element
      .querySelectorAll('menu-rating-input input')
      [rating - 1]?.dispatchEvent(new MouseEvent('click', { detail: 1 }));
  }

  it('names the item and the visit, and prefills what the user paid last time', async () => {
    const { element, field } = await open(`/log/${ITEM_ID}`, {});
    expect(element.querySelector('h1')?.textContent).toBe('רשומה חדשה');
    expect(element.querySelector('.item .name')?.textContent).toBe('המבורגר הקלאסי');
    expect(element.querySelector('.item .meta')?.textContent).toContain('ביקור 2');
    expect((field('input[formcontrolname="price"]') as HTMLInputElement).value).toBe('62');
    expect(element.querySelector('#price-hint')?.textContent.replace(/\s+/g, ' ').trim()).toBe(
      'בפעם הקודמת שילמת ₪62. המחיר בתפריט היום ₪68.',
    );
  });

  it('falls back to the menu price on a first visit and starts with the last visibility', async () => {
    const { field } = await open(
      `/log/${ITEM_ID}`,
      { forItem: vi.fn().mockResolvedValue({ ...sheet, mine: [] }) },
      'public',
    );
    expect((field('input[formcontrolname="price"]') as HTMLInputElement).value).toBe('68');
    expect(field('mat-button-toggle.mat-button-toggle-checked').textContent).toContain('כולם');
  });

  it('logs the entry in agorot and opens the item’s entries', async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ ...entry, id: '1e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10' });
    const { harness, element, field } = await open(`/log/${ITEM_ID}`, { create });
    star(element, 5);
    (field('.choices button') as HTMLButtonElement).click();
    const text = field('textarea') as HTMLTextAreaElement;
    text.value = '  מדיום מושלם ';
    text.dispatchEvent(new Event('input'));
    (field('button.save') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(create).toHaveBeenCalledWith(
      ITEM_ID,
      expect.objectContaining({
        rating: 5,
        wouldOrderAgain: true,
        pricePaid: 6200,
        text: 'מדיום מושלם',
        visibility: 'private',
      }),
    );
    expect(create.mock.calls[0]?.[1]).toHaveProperty('eatenAt');
    expect(TestBed.inject(Router).url).toBe(`/items/${ITEM_ID}/entries`);
  });

  it('refuses a price that is not whole shekels', async () => {
    const create = vi.fn();
    const { harness, field } = await open(`/log/${ITEM_ID}`, { create });
    const price = field('input[formcontrolname="price"]') as HTMLInputElement;
    price.value = '12.5';
    price.dispatchEvent(new Event('input'));
    (field('button.save') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(create).not.toHaveBeenCalled();
    expect(field('mat-error').textContent).toContain('מחיר בשקלים שלמים');
  });

  it('says so when the item no longer takes entries', async () => {
    const create = vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 403 }));
    const { harness, field } = await open(`/log/${ITEM_ID}`, { create });
    (field('button.save') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(field('[role="alert"]').textContent).toContain('אי אפשר לכתוב על הפריט');
    expect(TestBed.inject(Router).url).toBe(`/log/${ITEM_ID}`);
  });

  it('edits an entry with what it said, keeping its date', async () => {
    const update = vi.fn().mockResolvedValue({ ...entry, rating: 5 });
    const { harness, element, field } = await open(`/log/${ITEM_ID}/${entry.id}`, { update });
    expect(element.querySelector('h1')?.textContent).toBe('עריכת רשומה');
    expect(element.querySelectorAll('menu-rating-input label.on')).toHaveLength(4);
    expect(field('.choices button[aria-pressed="true"]').textContent.trim()).toBe('לא');
    expect((field('textarea') as HTMLTextAreaElement).value).toBe('קצת יבש');
    star(element, 5);
    (field('button.save') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(update).toHaveBeenCalledWith(entry.id, expect.objectContaining({ rating: 5 }));
    expect(update.mock.calls[0]?.[1]).not.toHaveProperty('eatenAt');
  });

  it('deletes an entry after a second tap', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const { harness, field } = await open(`/log/${ITEM_ID}/${entry.id}`, { remove });
    (field('button.delete') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(remove).not.toHaveBeenCalled();
    expect(field('button.delete').textContent).toContain('למחוק לתמיד?');
    (field('button.delete') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(remove).toHaveBeenCalledWith(entry.id);
    expect(TestBed.inject(Router).url).toBe(`/items/${ITEM_ID}/entries`);
  });

  it('reads an entry that is not the user’s as not found', async () => {
    const { element } = await open(`/log/${ITEM_ID}/1e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10`, {});
    expect(element.querySelector('[role="status"]')?.textContent).toContain('לא נמצאו');
    expect(element.querySelector('form')).toBeNull();
  });

  it('offers to try again when the item fails to load', async () => {
    const forItem = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(sheet);
    const { harness, field } = await open(`/log/${ITEM_ID}`, { forItem });
    (field('[role="alert"] button') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(forItem).toHaveBeenCalledTimes(2);
    expect(harness.routeNativeElement?.querySelector('form')).not.toBeNull();
  });
});
