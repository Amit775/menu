import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MenuApiClient } from '@menu/web/menus/data-access';
import { type RoleGrants, Roles } from '@menu/web/shared/util-auth';
import { I18n } from '@menu/web/shared/util-i18n';
import { burgerTag, classic, drinks, mains, menuApi, VENUE_ID } from '../testing/manage-fixtures';
import { ItemFormPage } from './item-form-page';

describe('ItemFormPage', () => {
  beforeEach(() => {
    // jsdom has no object URLs.
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() });
  });

  async function render(
    api: Partial<MenuApiClient>,
    url: string,
    roles?: RoleGrants,
  ): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'manage/venues/:id/items/new', component: ItemFormPage },
            { path: 'manage/venues/:id/items/:itemId', component: ItemFormPage },
            { path: '**', children: [] },
          ],
          withComponentInputBinding(),
        ),
        { provide: MenuApiClient, useValue: api },
      ],
    });
    TestBed.inject(I18n).setLanguage('he');
    if (roles) {
      TestBed.inject(Roles).set(roles);
    }
    const harness = await RouterTestingHarness.create(url);
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('mat-spinner')).toBeNull();
    });
    const element = harness.routeNativeElement;
    if (!element) {
      throw new Error('No page');
    }
    return element;
  }

  function field(element: HTMLElement, name: string): HTMLInputElement {
    const input = element.querySelector<HTMLInputElement>(`[name="item.${name}"]`);
    if (!input) {
      throw new Error(`No ${name}`);
    }
    return input;
  }

  function type(input: HTMLInputElement, value: string): void {
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function submit(element: HTMLElement): void {
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
  }

  it('adds an approved item in the section it came from, and goes back to the venue', async () => {
    const addItem = vi
      .fn()
      .mockResolvedValue({ ...classic, id: '8a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10' });
    const element = await render(
      menuApi({ addItem }),
      `/manage/venues/${VENUE_ID}/items/new?sectionId=${drinks.id}`,
    );
    TestBed.tick();
    expect(element.querySelector('h1')?.textContent).toBe('פריט חדש');
    expect(element.querySelector('mat-select.section')?.textContent).toContain('שתייה');
    type(field(element, 'nameHe'), ' לימונדה ');
    type(field(element, 'nameEn'), 'Lemonade');
    type(field(element, 'descriptionHe'), ' לימון ונענע ');
    type(field(element, 'price'), '18.5');
    submit(element);
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe(`/manage/venues/${VENUE_ID}`);
    });
    expect(addItem).toHaveBeenCalledWith(VENUE_ID, {
      sectionId: drinks.id,
      name: { he: 'לימונדה', en: 'Lemonade' },
      description: { he: 'לימון ונענע', en: null },
      listPrice: { value: 18.5, currency: 'ILS' as const },
      tagIds: [],
      variations: [],
    });
  });

  it('sends a Contributor back to the public venue page, which they can reach', async () => {
    const updateItem = vi.fn().mockResolvedValue(classic);
    const element = await render(
      menuApi({ updateItem }),
      `/manage/venues/${VENUE_ID}/items/${classic.id}`,
      { isAdmin: false, isContributor: true, ownedVenueIds: [] },
    );
    expect(element.querySelector('header a')?.getAttribute('href')).toBe(`/venues/${VENUE_ID}`);
    submit(element);
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe(`/venues/${VENUE_ID}`);
    });
  });

  it('needs the Hebrew description before the English one, and a price to the agora', async () => {
    const addItem = vi.fn();
    const element = await render(
      menuApi({ addItem }),
      `/manage/venues/${VENUE_ID}/items/new?sectionId=${drinks.id}`,
    );
    TestBed.tick();
    type(field(element, 'nameHe'), 'לימונדה');
    type(field(element, 'descriptionEn'), 'Lemon and mint');
    type(field(element, 'price'), '18.555');
    submit(element);
    TestBed.tick();
    expect(addItem).not.toHaveBeenCalled();
    const errors = [...element.querySelectorAll('mat-error')].map((error) =>
      error.textContent.trim(),
    );
    expect(errors).toEqual([
      'כתבו קודם תיאור בעברית, עד 2,000 תווים.',
      'מחיר בשקלים, עד שתי ספרות אחרי הנקודה, עד 100,000.',
    ]);
  });

  it('needs a Hebrew name and a section', async () => {
    const addItem = vi.fn();
    const element = await render(menuApi({ addItem }), `/manage/venues/${VENUE_ID}/items/new`);
    submit(element);
    TestBed.tick();
    expect(addItem).not.toHaveBeenCalled();
    const errors = [...element.querySelectorAll('mat-error')].map((error) =>
      error.textContent.trim(),
    );
    expect(errors).toEqual(['צריך שם בעברית.', 'בחרו קטע.']);
  });

  it('edits an item, its price to the agora', async () => {
    const odd = { ...classic, listPrice: { value: 62.5, currency: 'ILS' as const } };
    const updateItem = vi.fn().mockResolvedValue(odd);
    const element = await render(
      menuApi({ items: () => Promise.resolve([odd]), updateItem }),
      `/manage/venues/${VENUE_ID}/items/${classic.id}`,
    );
    expect(element.querySelector('h1')?.textContent).toBe('עריכת פריט');
    expect(field(element, 'nameHe').value).toBe('קלאסי');
    expect(field(element, 'price').value).toBe('62.5');
    element.querySelector<HTMLElement>('mat-select.tags .mat-mdc-select-trigger')?.click();
    TestBed.tick();
    const option = TestBed.inject(DOCUMENT).querySelector<HTMLElement>('mat-option');
    expect(option?.textContent.trim()).toBe(burgerTag.name.he);
    option?.click();
    TestBed.tick();
    submit(element);
    await vi.waitFor(() => {
      expect(updateItem).toHaveBeenCalledWith(classic.id, {
        sectionId: mains.id,
        name: { he: 'קלאסי', en: null },
        description: null,
        listPrice: { value: 62.5, currency: 'ILS' as const },
        tagIds: [],
        variations: [],
      });
    });
  });

  it('edits the item’s variations: keeps, pauses, removes and adds', async () => {
    const chicken = {
      id: '5b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
      name: { he: 'עוף', en: 'Chicken' },
      price: { value: 58, currency: 'ILS' as const },
      tagIds: [],
      available: true,
    };
    const beef = {
      ...chicken,
      id: '6b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
      name: { he: 'בקר', en: null },
    };
    const varied = { ...classic, variations: [chicken, beef] };
    const updateItem = vi.fn().mockResolvedValue(varied);
    const element = await render(
      menuApi({ items: () => Promise.resolve([varied]), updateItem }),
      `/manage/venues/${VENUE_ID}/items/${classic.id}`,
    );
    expect(field(element, 'variations.0.nameHe').value).toBe('עוף');
    expect(field(element, 'variations.0.price').value).toBe('58');
    field(element, 'variations.0.available').click();
    element.querySelectorAll<HTMLButtonElement>('.variation button.remove')[1]?.click();
    element.querySelector<HTMLButtonElement>('button.add-variation')?.click();
    TestBed.tick();
    type(field(element, 'variations.1.nameHe'), ' טבעוני ');
    submit(element);
    await vi.waitFor(() => {
      expect(updateItem).toHaveBeenCalledWith(
        classic.id,
        expect.objectContaining({
          variations: [
            { ...chicken, available: false },
            { name: { he: 'טבעוני', en: null }, price: null, tagIds: [], available: true },
          ],
        }),
      );
    });
  });

  it('needs a Hebrew name for every variation, each a different one', async () => {
    const updateItem = vi.fn();
    const element = await render(
      menuApi({ updateItem }),
      `/manage/venues/${VENUE_ID}/items/${classic.id}`,
    );
    element.querySelector<HTMLButtonElement>('button.add-variation')?.click();
    element.querySelector<HTMLButtonElement>('button.add-variation')?.click();
    TestBed.tick();
    type(field(element, 'variations.0.nameHe'), 'עוף');
    submit(element);
    TestBed.tick();
    type(field(element, 'variations.1.nameHe'), 'עוף');
    submit(element);
    TestBed.tick();
    expect(updateItem).not.toHaveBeenCalled();
    expect(element.querySelector('.variation mat-error')?.textContent).toBe(
      'לכל גרסה צריך שם משלה בעברית.',
    );
  });

  describe('the item’s photo', () => {
    const photoUrl = '/api/item-photos/abcdefghijklmnopqrstuv';

    function pickPhoto(element: HTMLElement, photo: Blob): void {
      const input = element.querySelector<HTMLInputElement>('.photo input[type="file"]');
      if (!input) {
        throw new Error('No photo input');
      }
      Object.defineProperty(input, 'files', { value: [photo], configurable: true });
      input.dispatchEvent(new Event('change'));
    }

    it('uploads a picked photo once a new item is added', async () => {
      const added = { ...classic, id: '8a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10' };
      const addItem = vi.fn().mockResolvedValue(added);
      const setItemPhoto = vi.fn().mockResolvedValue({ ...added, photoUrl });
      const element = await render(
        menuApi({ addItem, setItemPhoto }),
        `/manage/venues/${VENUE_ID}/items/new?sectionId=${drinks.id}`,
      );
      TestBed.tick();
      type(field(element, 'nameHe'), 'לימונדה');
      const photo = new Blob(['jpeg'], { type: 'image/jpeg' });
      pickPhoto(element, photo);
      await vi.waitFor(() => {
        TestBed.tick();
        expect(element.querySelector('.photo .preview')).not.toBeNull();
      });
      submit(element);
      await vi.waitFor(() => {
        expect(TestBed.inject(Router).url).toBe(`/manage/venues/${VENUE_ID}`);
      });
      expect(setItemPhoto).toHaveBeenCalledWith(added.id, photo);
    });

    it('shows the item’s photo and removes it on save', async () => {
      const shown = { ...classic, photoUrl };
      const updateItem = vi.fn().mockResolvedValue(shown);
      const removeItemPhoto = vi.fn().mockResolvedValue(classic);
      const element = await render(
        menuApi({ items: () => Promise.resolve([shown]), updateItem, removeItemPhoto }),
        `/manage/venues/${VENUE_ID}/items/${classic.id}`,
      );
      expect(element.querySelector('.photo .preview')?.getAttribute('style')).toContain(photoUrl);
      element.querySelector<HTMLButtonElement>('.photo button.remove-photo')?.click();
      TestBed.tick();
      expect(element.querySelector('.photo .preview')).toBeNull();
      submit(element);
      await vi.waitFor(() => {
        expect(removeItemPhoto).toHaveBeenCalledWith(classic.id);
      });
    });

    it('keeps the saved item and says so when the photo is refused', async () => {
      const updateItem = vi.fn().mockResolvedValue(classic);
      const setItemPhoto = vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 415 }));
      const element = await render(
        menuApi({ updateItem, setItemPhoto }),
        `/manage/venues/${VENUE_ID}/items/${classic.id}`,
      );
      pickPhoto(element, new Blob(['gif'], { type: 'image/gif' }));
      await vi.waitFor(() => {
        TestBed.tick();
        expect(element.querySelector('.photo .preview')).not.toBeNull();
      });
      submit(element);
      await vi.waitFor(() => {
        TestBed.tick();
        expect(element.querySelector('.error')?.textContent).toBe(
          'הפריט נשמר, אבל אי אפשר להשתמש בתמונה הזו. נסו JPEG,‏ PNG או WebP עד 8MB.',
        );
      });
      expect(TestBed.inject(Router).url).toBe(`/manage/venues/${VENUE_ID}/items/${classic.id}`);
    });
  });

  it('says so when the item is not on this venue', async () => {
    const element = await render(
      menuApi(),
      `/manage/venues/${VENUE_ID}/items/0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b99`,
    );
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('הפריט לא נמצא');
  });

  it('keeps the form and says so when saving fails', async () => {
    const element = await render(
      menuApi({ updateItem: vi.fn().mockRejectedValue(new Error('500')) }),
      `/manage/venues/${VENUE_ID}/items/${classic.id}`,
    );
    submit(element);
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('.error')?.textContent).toBe('הפריט לא נשמר. נסו שוב.');
    });
    expect(TestBed.inject(Router).url).toBe(`/manage/venues/${VENUE_ID}/items/${classic.id}`);
  });
});
