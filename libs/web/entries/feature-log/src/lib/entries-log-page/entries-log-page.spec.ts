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
  variationId: null,
  venueId: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10',
  eatenAt: '2026-10-20T19:30:00.000Z',
  rating: 4,
  wouldOrderAgain: false,
  pricePaid: { value: 62, currency: 'ILS' as const },
  text: 'קצת יבש',
  visibility: 'public',
  shareToken: 'abcdefghijklmnopqrstuv',
  hidden: false,
  photoUrl: null,
  createdAt: '2026-10-20T20:00:00.000Z',
  updatedAt: '2026-10-20T20:00:00.000Z',
};
const sheet: ItemEntries = {
  item: {
    id: ITEM_ID,
    name: { he: 'המבורגר הקלאסי', en: null },
    listPrice: { value: 68, currency: 'ILS' as const },
    variations: [],
    venue: { id: entry.venueId, name: { he: 'בורגר 24', en: null } },
  },
  itemIsPublic: true,
  savedByMe: false,
  mine: [entry],
  others: [],
};

describe('EntriesLogPage', () => {
  beforeEach(() => {
    // jsdom has no object URLs.
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
  });

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
    expect((field('input[type="number"]') as HTMLInputElement).value).toBe('62');
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
    expect((field('input[type="number"]') as HTMLInputElement).value).toBe('68');
    expect(field('mat-button-toggle.mat-button-toggle-checked').textContent).toContain('כולם');
  });

  it('logs the entry with its price in shekels and opens the item’s entries', async () => {
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
        pricePaid: { value: 62, currency: 'ILS' as const },
        text: 'מדיום מושלם',
        visibility: 'private',
      }),
    );
    expect(create.mock.calls[0]?.[1]).toHaveProperty('eatenAt');
    expect(TestBed.inject(Router).url).toBe(`/items/${ITEM_ID}/entries`);
  });

  describe('on an item the diner saved to try', () => {
    const saved = { ...sheet, savedByMe: true, mine: [] };
    const created = { ...entry, id: '1e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10' };

    it('takes it off the list once logged, unless the diner says not to', async () => {
      const unsave = vi.fn().mockResolvedValue(undefined);
      const { harness, field } = await open(`/log/${ITEM_ID}`, {
        forItem: vi.fn().mockResolvedValue(saved),
        create: vi.fn().mockResolvedValue(created),
        unsave,
      });
      expect(field('mat-checkbox.unsave').textContent).toContain('להוריד מרשימת');
      (field('button.save') as HTMLButtonElement).click();
      await harness.fixture.whenStable();
      expect(unsave).toHaveBeenCalledWith(ITEM_ID);
    });

    it('keeps it on the list when unticked', async () => {
      const unsave = vi.fn();
      const { harness, field } = await open(`/log/${ITEM_ID}`, {
        forItem: vi.fn().mockResolvedValue(saved),
        create: vi.fn().mockResolvedValue(created),
        unsave,
      });
      (field('mat-checkbox.unsave input') as HTMLInputElement).click();
      (field('button.save') as HTMLButtonElement).click();
      await harness.fixture.whenStable();
      expect(unsave).not.toHaveBeenCalled();
    });

    it('still opens the entries when taking it off fails', async () => {
      const { harness, field } = await open(`/log/${ITEM_ID}`, {
        forItem: vi.fn().mockResolvedValue(saved),
        create: vi.fn().mockResolvedValue(created),
        unsave: vi.fn().mockRejectedValue(new Error('offline')),
      });
      (field('button.save') as HTMLButtonElement).click();
      await harness.fixture.whenStable();
      expect(TestBed.inject(Router).url).toBe(`/items/${ITEM_ID}/entries`);
    });
  });

  it('offers nothing about the list for an item not saved', async () => {
    const { element } = await open(`/log/${ITEM_ID}`, {});
    expect(element.querySelector('mat-checkbox.unsave')).toBeNull();
  });

  describe('with variations', () => {
    const beef = '5b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
    const vegan = '6b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
    const pumpkin = '8b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
    const varied: ItemEntries = {
      ...sheet,
      item: {
        ...sheet.item,
        variations: [
          { id: beef, name: { he: 'בקר', en: null }, price: null, available: true },
          {
            id: vegan,
            name: { he: 'טבעוני', en: null },
            price: { value: 62, currency: 'ILS' },
            available: true,
          },
          { id: pumpkin, name: { he: 'דלעת', en: null }, price: null, available: false },
        ],
      },
    };
    const picks = (element: HTMLElement) =>
      [...element.querySelectorAll<HTMLButtonElement>('.picks button')].map((button) => ({
        name: button.textContent.trim(),
        pressed: button.getAttribute('aria-pressed') === 'true',
      }));

    it('asks which one the diner had among those offered, and logs it', async () => {
      const create = vi.fn().mockResolvedValue(entry);
      const { harness, element, field } = await open(`/log/${ITEM_ID}`, {
        forItem: vi.fn().mockResolvedValue({ ...varied, mine: [] }),
        create,
      });
      expect(field('.variations legend').textContent).toBe('איזו גרסה?');
      expect(picks(element)).toEqual([
        { name: 'בקר', pressed: false },
        { name: 'טבעוני', pressed: false },
      ]);
      element.querySelectorAll<HTMLButtonElement>('.picks button')[1]?.click();
      harness.detectChanges();
      expect(picks(element)[1]?.pressed).toBe(true);
      expect(field('#price-hint').textContent.trim()).toBe('המחיר בתפריט היום ₪62.');
      (field('button.save') as HTMLButtonElement).click();
      await harness.fixture.whenStable();
      expect(create.mock.calls[0]?.[1]).toHaveProperty('variationId', vegan);
    });

    it('keeps the paused variation an entry names, and clears it on a second tap', async () => {
      const update = vi.fn().mockResolvedValue(entry);
      const { harness, element } = await open(`/log/${ITEM_ID}/${entry.id}`, {
        forItem: vi
          .fn()
          .mockResolvedValue({ ...varied, mine: [{ ...entry, variationId: pumpkin }] }),
        update,
      });
      expect(picks(element)).toEqual([
        { name: 'בקר', pressed: false },
        { name: 'טבעוני', pressed: false },
        { name: 'דלעת', pressed: true },
      ]);
      element.querySelectorAll<HTMLButtonElement>('.picks button')[2]?.click();
      harness.detectChanges();
      element.querySelector<HTMLButtonElement>('button.save')?.click();
      await harness.fixture.whenStable();
      expect(update.mock.calls[0]?.[1]).toHaveProperty('variationId', null);
    });

    it('asks nothing for an item without variations', async () => {
      const { element } = await open(`/log/${ITEM_ID}`, {});
      expect(element.querySelector('.variations')).toBeNull();
    });
  });

  it('refuses a price with more than two decimals', async () => {
    const create = vi.fn();
    const { harness, field } = await open(`/log/${ITEM_ID}`, { create });
    const price = field('input[type="number"]') as HTMLInputElement;
    price.value = '12.555';
    price.dispatchEvent(new Event('input'));
    (field('button.save') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(create).not.toHaveBeenCalled();
    expect(field('mat-error').textContent).toContain('עד שתי ספרות אחרי הנקודה');
  });

  it('prefills a price with its decimals and saves it unchanged', async () => {
    const create = vi.fn().mockResolvedValue(entry);
    const { harness, field } = await open(`/log/${ITEM_ID}`, {
      forItem: vi.fn().mockResolvedValue({
        ...sheet,
        item: { ...sheet.item, listPrice: { value: 42.5, currency: 'ILS' as const } },
        mine: [],
      }),
      create,
    });
    expect((field('input[type="number"]') as HTMLInputElement).value).toBe('42.5');
    (field('button.save') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(create).toHaveBeenCalledWith(
      ITEM_ID,
      expect.objectContaining({ pricePaid: { value: 42.5, currency: 'ILS' as const } }),
    );
  });

  it('tells the submitter of a new item that it waits for approval', async () => {
    const { element } = await open(`/log/${ITEM_ID}`, {
      forItem: vi.fn().mockResolvedValue({ ...sheet, itemIsPublic: false, mine: [] }),
    });
    expect(element.querySelector('.pending')?.textContent).toContain('ממתין לאישור');
  });

  it('keeps the pending note away from public items', async () => {
    const { element } = await open(`/log/${ITEM_ID}`, {});
    expect(element.querySelector('.pending')).toBeNull();
  });

  it('asks for a date when the field is empty, and refuses one in the future', async () => {
    const { harness, field } = await open(`/log/${ITEM_ID}`, {});
    const when = field('input[type="datetime-local"]') as HTMLInputElement;
    when.value = '';
    when.dispatchEvent(new Event('input'));
    (field('button.save') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(field('mat-error').textContent).toContain('מתי אכלת');
    when.value = '2999-01-01T12:00';
    when.dispatchEvent(new Event('input'));
    await harness.fixture.whenStable();
    expect(field('mat-error').textContent).toContain('לא בעתיד');
  });

  it('moves focus to the first field to fix', async () => {
    const { harness, field } = await open(`/log/${ITEM_ID}`, {});
    const price = field('input[type="number"]') as HTMLInputElement;
    price.value = '-3';
    price.dispatchEvent(new Event('input'));
    (field('button.save') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(price.ownerDocument.activeElement).toBe(price);
  });

  it('fills again for another item when the page is reused', async () => {
    const other = '8b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
    const forItem = vi.fn((id: string) =>
      Promise.resolve(
        id === other
          ? {
              ...sheet,
              item: {
                ...sheet.item,
                id: other,
                listPrice: { value: 30, currency: 'ILS' as const },
              },
              mine: [],
            }
          : sheet,
      ),
    );
    const { harness } = await open(`/log/${ITEM_ID}`, { forItem });
    await harness.navigateByUrl(`/log/${other}`, EntriesLogPage);
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(
        harness.routeNativeElement?.querySelector<HTMLInputElement>('input[type="number"]')?.value,
      ).toBe('30');
    });
  });

  it('starts clean for another item even when it opens with the same price', async () => {
    const other = '8b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
    const forItem = vi.fn((id: string) =>
      Promise.resolve(
        id === other
          ? {
              ...sheet,
              item: {
                ...sheet.item,
                id: other,
                listPrice: { value: 62.5, currency: 'ILS' as const },
              },
              mine: [],
            }
          : {
              ...sheet,
              item: { ...sheet.item, listPrice: { value: 62.5, currency: 'ILS' as const } },
              mine: [],
            },
      ),
    );
    const create = vi.fn().mockResolvedValue({ ...entry, itemId: other });
    const { harness, field } = await open(`/log/${ITEM_ID}`, { forItem, create });
    const note = field('textarea') as HTMLTextAreaElement;
    note.value = 'טעים';
    note.dispatchEvent(new Event('input'));
    const price = field('input[type="number"]') as HTMLInputElement;
    price.value = '70';
    price.dispatchEvent(new Event('input'));
    await harness.navigateByUrl(`/log/${other}`, EntriesLogPage);
    await harness.fixture.whenStable();
    expect((field('textarea') as HTMLTextAreaElement).value).toBe('');
    (field('button.save') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(create).toHaveBeenCalledWith(
      other,
      expect.objectContaining({ text: '', pricePaid: { value: 62.5, currency: 'ILS' as const } }),
    );
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

  it('leaves an edited entry’s exact price alone unless the price changed', async () => {
    const exact = { ...entry, pricePaid: { value: 62.5, currency: 'ILS' as const } };
    const update = vi.fn().mockResolvedValue(exact);
    const { harness, field } = await open(`/log/${ITEM_ID}/${entry.id}`, {
      forItem: vi.fn().mockResolvedValue({ ...sheet, mine: [exact] }),
      update,
    });
    (field('button.save') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(update).toHaveBeenCalledWith(
      entry.id,
      expect.objectContaining({ pricePaid: { value: 62.5, currency: 'ILS' as const } }),
    );
  });

  it('deletes an entry after a second tap', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const { harness, field } = await open(`/log/${ITEM_ID}/${entry.id}`, { remove });
    (field('button.delete') as HTMLButtonElement).click();
    await harness.fixture.whenStable();
    expect(remove).not.toHaveBeenCalled();
    expect(field('button.delete').textContent).toContain('למחוק לתמיד?');
    expect(field('.delete-hint').textContent).toContain('לחצו שוב');
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

  function pickPhoto(element: HTMLElement, photo: Blob): void {
    const input = element.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) {
      throw new Error('No photo input');
    }
    Object.defineProperty(input, 'files', { value: [photo], configurable: true });
    input.dispatchEvent(new Event('change'));
  }

  const photoUrl = `/api/photos/${'p'.repeat(22)}`;

  it('uploads a picked photo once the entry is logged', async () => {
    const created = { ...entry, id: '1e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10' };
    const create = vi.fn().mockResolvedValue(created);
    const setPhoto = vi.fn().mockResolvedValue({ ...created, photoUrl });
    const { harness, element, field } = await open(`/log/${ITEM_ID}`, { create, setPhoto });
    expect(field('button.pick').textContent).toContain('הוספת תמונה');
    const photo = new Blob(['jpeg'], { type: 'image/jpeg' });
    pickPhoto(element, photo);
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(field('.preview').getAttribute('style')).toContain('blob:preview');
    });
    expect(field('button.pick').textContent).toContain('החלפת תמונה');
    field('form').dispatchEvent(new Event('submit'));
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe(`/items/${ITEM_ID}/entries`);
    });
    expect(setPhoto).toHaveBeenCalledWith(created.id, photo);
    expect(create.mock.invocationCallOrder[0]).toBeLessThan(
      setPhoto.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('shows an edited entry’s photo and removes it on save', async () => {
    const withPhoto = { ...entry, photoUrl };
    const update = vi.fn().mockResolvedValue(withPhoto);
    const removePhoto = vi.fn().mockResolvedValue(entry);
    const { harness, element, field } = await open(`/log/${ITEM_ID}/${entry.id}`, {
      forItem: vi.fn().mockResolvedValue({ ...sheet, mine: [withPhoto] }),
      update,
      removePhoto,
    });
    expect(field('.preview').getAttribute('style')).toContain(photoUrl);
    (field('button.remove-photo') as HTMLButtonElement).click();
    harness.detectChanges();
    expect(element.querySelector('.preview')).toBeNull();
    field('form').dispatchEvent(new Event('submit'));
    await vi.waitFor(() => {
      expect(removePhoto).toHaveBeenCalledWith(entry.id);
    });
    expect(update).toHaveBeenCalled();
  });

  it('leaves the photo alone when it did not change', async () => {
    const update = vi.fn().mockResolvedValue(entry);
    const setPhoto = vi.fn();
    const removePhoto = vi.fn();
    const { field } = await open(`/log/${ITEM_ID}/${entry.id}`, { update, setPhoto, removePhoto });
    field('form').dispatchEvent(new Event('submit'));
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe(`/items/${ITEM_ID}/entries`);
    });
    expect(setPhoto).not.toHaveBeenCalled();
    expect(removePhoto).not.toHaveBeenCalled();
  });

  it('keeps a logged entry when its photo is refused, and edits it on the next try', async () => {
    const created = { ...entry, id: '1e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10' };
    const create = vi.fn().mockResolvedValue(created);
    const setPhoto = vi.fn().mockRejectedValueOnce(new HttpErrorResponse({ status: 415 }));
    const update = vi.fn().mockResolvedValue(created);
    const { harness, element, field } = await open(`/log/${ITEM_ID}`, {
      create,
      setPhoto,
      update,
    });
    pickPhoto(element, new Blob(['gif'], { type: 'image/gif' }));
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(element.querySelector('.preview')).not.toBeNull();
    });
    field('form').dispatchEvent(new Event('submit'));
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(element.querySelector('[role="alert"]')?.textContent).toContain('הרשומה נשמרה');
    });
    setPhoto.mockResolvedValue({ ...created, photoUrl });
    field('form').dispatchEvent(new Event('submit'));
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe(`/items/${ITEM_ID}/entries`);
    });
    expect(create).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(created.id, expect.anything());
    expect(setPhoto).toHaveBeenCalledTimes(2);
  });
});
