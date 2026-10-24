import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { type GeoPoint } from '@menu/shared/contracts';
import { MenuApiClient } from '@menu/web/menus/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { LeafletLoader } from '@menu/web/shared/util-map';
import { menuApi, venue, VENUE_ID } from '../testing/manage-fixtures';
import { VenueFormPage } from './venue-form-page';

function fakeLeaflet() {
  const seen: {
    tap?: (event: { latlng: GeoPoint }) => void;
    pin?: GeoPoint;
    center?: GeoPoint;
  } = {};
  const chain = { addTo: () => chain };
  const L = {
    map: () => {
      const map = {
        setView: () => map,
        on: (_event: string, handler: (event: { latlng: GeoPoint }) => void) => {
          seen.tap = handler;
          return map;
        },
        panTo: (point: GeoPoint) => {
          seen.center = point;
          return map;
        },
        remove: vi.fn(),
      };
      return map;
    },
    tileLayer: () => chain,
    divIcon: (options: unknown) => options,
    marker: (point: GeoPoint) => {
      seen.pin = point;
      const marker = {
        on: () => marker,
        addTo: () => marker,
        setLatLng: (next: GeoPoint) => {
          seen.pin = next;
          return marker;
        },
        getLatLng: () => seen.pin,
      };
      return marker;
    },
  };
  return { L, seen };
}

describe('VenueFormPage', () => {
  async function render(api: Partial<MenuApiClient>, url: string) {
    const leaflet = fakeLeaflet();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'manage/venues/new', component: VenueFormPage },
            { path: 'manage/venues/:id/edit', component: VenueFormPage },
            { path: '**', children: [] },
          ],
          withComponentInputBinding(),
        ),
        { provide: MenuApiClient, useValue: api },
        { provide: LeafletLoader, useValue: { load: () => Promise.resolve(leaflet.L) } },
      ],
    });
    TestBed.inject(I18n).setLanguage('he');
    const harness = await RouterTestingHarness.create(url);
    await harness.fixture.whenStable();
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('mat-spinner')).toBeNull();
    });
    const element = harness.routeNativeElement;
    if (!element) {
      throw new Error('No page');
    }
    await vi.waitFor(() => {
      expect(leaflet.seen.tap).toBeDefined();
    });
    return { element, seen: leaflet.seen };
  }

  function field(element: HTMLElement, name: string): HTMLInputElement {
    const input = element.querySelector<HTMLInputElement>(`[name="venue.${name}"]`);
    if (!input) {
      throw new Error(`No ${name}`);
    }
    return input;
  }

  function type(element: HTMLElement, name: string, value: string): void {
    const input = field(element, name);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function submit(element: HTMLElement): void {
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    TestBed.tick();
  }

  it('creates a venue pinned where the Admin tapped, with its first sections', async () => {
    const createVenue = vi.fn().mockResolvedValue(venue);
    const { element, seen } = await render(menuApi({ createVenue }), '/manage/venues/new');
    type(element, 'nameHe', 'בורגר 24');
    type(element, 'address', ' דיזנגוף 100, תל אביב ');
    seen.tap?.({ latlng: { lat: 32.0800001234, lng: 34.77 } });
    TestBed.tick();
    expect(field(element, 'lat').value).toBe('32.08');
    expect(seen.pin).toEqual({ lat: 32.08, lng: 34.77 });
    expect(seen.center).toBeUndefined();
    type(element, 'sections', 'עיקריות\n\n שתייה \n');
    submit(element);
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe(`/manage/venues/${VENUE_ID}`);
    });
    expect(createVenue).toHaveBeenCalledWith({
      name: { he: 'בורגר 24' },
      address: 'דיזנגוף 100, תל אביב',
      location: { lat: 32.08, lng: 34.77 },
      phone: null,
      reservationUrl: null,
      sections: [{ he: 'עיקריות' }, { he: 'שתייה' }],
    });
  });

  it('needs a name, an address and a place on the map', async () => {
    const createVenue = vi.fn();
    const { element } = await render(menuApi({ createVenue }), '/manage/venues/new');
    submit(element);
    expect(createVenue).not.toHaveBeenCalled();
    const errors = [...element.querySelectorAll('mat-error')].map((error) =>
      error.textContent.trim(),
    );
    expect(errors).toEqual([
      'צריך שם בעברית.',
      'צריך כתובת.',
      'סמנו את המקום במפה.',
      'סמנו את המקום במפה.',
    ]);
  });

  it('rejects a phone or link the API would refuse', async () => {
    const createVenue = vi.fn();
    const { element, seen } = await render(menuApi({ createVenue }), '/manage/venues/new');
    type(element, 'nameHe', 'בורגר 24');
    type(element, 'address', 'דיזנגוף 100');
    seen.tap?.({ latlng: { lat: 32.08, lng: 34.77 } });
    type(element, 'phone', 'call us');
    type(element, 'reservationUrl', 'ftp://example.com');
    submit(element);
    expect(createVenue).not.toHaveBeenCalled();
    const errors = [...element.querySelectorAll('mat-error')].map((error) =>
      error.textContent.trim(),
    );
    expect(errors).toEqual(['מספר טלפון, 6 עד 20 ספרות.', 'קישור שמתחיל ב-https://']);
  });

  it('edits a venue: typed coordinates move the pin, and it can be hidden', async () => {
    const updateVenue = vi.fn().mockResolvedValue({ ...venue, status: 'hidden' });
    const { element, seen } = await render(
      menuApi({ updateVenue }),
      `/manage/venues/${VENUE_ID}/edit`,
    );
    expect(element.querySelector('h1')?.textContent).toBe('עריכת המקום');
    expect(field(element, 'nameEn').value).toBe('Burger 24');
    expect(seen.pin).toEqual(venue.location);
    type(element, 'lat', '32.09');
    TestBed.tick();
    expect(seen.pin).toEqual({ lat: 32.09, lng: venue.location.lng });
    expect(seen.center).toEqual({ lat: 32.09, lng: venue.location.lng });
    expect(element.querySelector('[name="venue.sections"]')).toBeNull();
    element.querySelector<HTMLElement>('mat-select.status .mat-mdc-select-trigger')?.click();
    TestBed.tick();
    const hidden = [...element.ownerDocument.querySelectorAll<HTMLElement>('mat-option')].find(
      (option) => option.textContent.trim() === 'מוסתר',
    );
    hidden?.click();
    submit(element);
    await vi.waitFor(() => {
      expect(updateVenue).toHaveBeenCalledWith(VENUE_ID, {
        name: { he: 'בורגר 24', en: 'Burger 24' },
        address: venue.address,
        location: { lat: 32.09, lng: venue.location.lng },
        phone: venue.phone,
        reservationUrl: null,
        status: 'hidden',
      });
    });
  });

  it('keeps the form and says so when saving fails', async () => {
    const { element } = await render(
      menuApi({ updateVenue: vi.fn().mockRejectedValue(new Error('500')) }),
      `/manage/venues/${VENUE_ID}/edit`,
    );
    submit(element);
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('.error')?.textContent).toBe('המקום לא נשמר. נסו שוב.');
    });
  });
});
