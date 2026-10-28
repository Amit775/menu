import { DOCUMENT } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { type Item, type MenuSection, type Venue } from '@menu/shared/contracts';
import { MenuApiClient } from '@menu/web/menus/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { MenusAddItemPage } from './menus-add-item-page';

const VENUE_ID = '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';
const venue: Venue = {
  id: VENUE_ID,
  name: { he: 'מוזס', en: null },
  address: { he: 'רוטשילד 35, תל אביב', en: null },
  location: { lat: 32.0641, lng: 34.7744 },
  phone: null,
  reservationUrl: null,
  status: 'active',
  createdAt: '2026-10-01T10:00:00.000Z',
};
const sections: MenuSection[] = [
  {
    id: '5c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
    venueId: VENUE_ID,
    name: { he: 'ראשונות', en: null },
    position: 0,
  },
  {
    id: '6c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
    venueId: VENUE_ID,
    name: { he: 'עיקריות', en: null },
    position: 1,
  },
];
const created: Item = {
  id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  venueId: VENUE_ID,
  sectionId: '6c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
  name: { he: 'שקשוקה', en: null },
  description: null,
  listPrice: { value: 54, currency: 'ILS' as const },
  tagIds: [],
  variations: [],
  state: 'pending',
  mergedIntoId: null,
  submittedByMe: true,
  position: 0,
  createdAt: '2026-10-23T10:00:00.000Z',
};

describe('MenusAddItemPage', () => {
  async function open(api: Partial<MenuApiClient>, language: 'he' | 'en' = 'he') {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'venues/:id/add-item', component: MenusAddItemPage },
            { path: '**', children: [] },
          ],
          withComponentInputBinding(),
        ),
        {
          provide: MenuApiClient,
          useValue: {
            venue: vi.fn().mockResolvedValue(venue),
            sections: vi.fn().mockResolvedValue(sections),
            ...api,
          },
        },
      ],
    });
    TestBed.inject(I18n).setLanguage(language);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/venues/${VENUE_ID}/add-item`, MenusAddItemPage);
    await harness.fixture.whenStable();
    const element = harness.routeNativeElement;
    if (!element) {
      throw new Error('The page did not render.');
    }
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(element.querySelector('mat-spinner')).toBeNull();
    });
    return { harness, element };
  }

  async function pick(harness: RouterTestingHarness, element: HTMLElement, text: string) {
    element.querySelector<HTMLElement>('.mat-mdc-select-trigger')?.click();
    await harness.fixture.whenStable();
    const options = [...TestBed.inject(DOCUMENT).querySelectorAll<HTMLElement>('mat-option')];
    options.find((option) => option.textContent.trim() === text)?.click();
    await harness.fixture.whenStable();
  }

  function type(element: HTMLElement, selector: string, value: string): void {
    const input = element.querySelector<HTMLInputElement>(selector);
    if (!input) {
      throw new Error(`No ${selector}`);
    }
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('adds the item in the chosen section, then opens the log form for it', async () => {
    const addItem = vi.fn().mockResolvedValue(created);
    const { harness, element } = await open({ addItem });
    expect(element.querySelector('.intro')?.textContent).toContain('למוזס');
    type(element, 'input[formcontrolname="name"]', '  שקשוקה ');
    await pick(harness, element, 'עיקריות');
    type(element, 'input[formcontrolname="price"]', '54');
    element.querySelector<HTMLButtonElement>('button.save')?.click();
    await harness.fixture.whenStable();
    expect(addItem).toHaveBeenCalledWith(VENUE_ID, {
      sectionId: sections[1]?.id,
      name: { he: 'שקשוקה', en: null },
      listPrice: { value: 54, currency: 'ILS' as const },
    });
    expect(TestBed.inject(Router).url).toBe(`/log/${created.id}`);
  });

  it('keeps a name typed in English as its English name too', async () => {
    const addItem = vi.fn().mockResolvedValue(created);
    const { harness, element } = await open({ addItem }, 'en');
    type(element, 'input[formcontrolname="name"]', 'Shakshuka');
    await pick(harness, element, 'עיקריות');
    element.querySelector<HTMLButtonElement>('button.save')?.click();
    await harness.fixture.whenStable();
    expect(addItem).toHaveBeenCalledWith(
      VENUE_ID,
      expect.objectContaining({ name: { he: 'Shakshuka', en: 'Shakshuka' } }),
    );
  });

  it('asks for a name and a section before adding', async () => {
    const addItem = vi.fn();
    const { harness, element } = await open({ addItem });
    type(element, 'input[formcontrolname="name"]', '   ');
    element.querySelector<HTMLButtonElement>('button.save')?.click();
    await harness.fixture.whenStable();
    expect(addItem).not.toHaveBeenCalled();
    const errors = [...element.querySelectorAll('mat-error')].map((error) =>
      error.textContent.trim(),
    );
    expect(errors).toEqual(['צריך שם', 'בחרו חלק בתפריט']);
  });

  it('says so when adding fails, and stays on the form', async () => {
    const { harness, element } = await open({
      addItem: vi.fn().mockRejectedValue(new Error('offline')),
    });
    type(element, 'input[formcontrolname="name"]', 'שקשוקה');
    await pick(harness, element, 'ראשונות');
    element.querySelector<HTMLButtonElement>('button.save')?.click();
    await harness.fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('ההוספה לא הצליחה');
    expect(TestBed.inject(Router).url).toBe(`/venues/${VENUE_ID}/add-item`);
  });

  it('explains when the venue has no menu sections yet', async () => {
    const { element } = await open({ sections: vi.fn().mockResolvedValue([]) });
    expect(element.querySelector('form')).toBeNull();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('עוד אין חלקים');
  });

  it('says when the venue does not exist', async () => {
    const { element } = await open({
      venue: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 404 })),
    });
    expect(element.querySelector('[role="status"]')?.textContent).toContain('לא נמצא');
  });
});
