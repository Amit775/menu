import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type MapPin } from '@menu/shared/contracts';
import { FeedStore } from '@menu/web/discover/data-access';
import { DeviceLocation } from '@menu/web/shared/util-device';
import { I18n } from '@menu/web/shared/util-i18n';
import { boundaries, VENUE_ID } from '../testing/feed-fixtures';
import { LeafletLoader, TEL_AVIV } from '@menu/web/shared/util-map';
import { VenueMap } from './venue-map';

interface FakeMarker {
  location: unknown;
  options: { icon: { html: string; className: string } };
  element: HTMLElement;
  click?: () => void;
}

/** Just enough of Leaflet to see what the map draws. */
function fakeLeaflet() {
  const markers: FakeMarker[] = [];
  const view: { center?: unknown; zoom?: number; bounds?: unknown; me?: unknown } = {};
  const remove = vi.fn();
  const chain = { addTo: () => chain, bindTooltip: () => chain };
  const L = {
    map: () => {
      const map = {
        setView: (center: unknown, zoom: number) => {
          Object.assign(view, { center, zoom });
          return map;
        },
        fitBounds: (bounds: unknown) => {
          view.bounds = bounds;
        },
        invalidateSize: vi.fn(),
        remove,
      };
      return map;
    },
    tileLayer: () => chain,
    circleMarker: (point: unknown) => {
      view.me = point;
      return chain;
    },
    layerGroup: () => {
      const group = { addTo: () => group, clearLayers: () => markers.splice(0) };
      return group;
    },
    divIcon: (options: unknown) => options,
    latLngBounds: (points: unknown) => points,
    marker: (location: unknown, options: FakeMarker['options']) => {
      const marker: FakeMarker = {
        location,
        options,
        element: TestBed.inject(DOCUMENT).createElement('div'),
      };
      const api = {
        getElement: () => marker.element,
        on: (_event: string, handler: () => void) => {
          marker.click = handler;
          return api;
        },
        addTo: () => {
          markers.push(marker);
          return api;
        },
      };
      return api;
    },
  };
  return { L, markers, view, remove };
}

describe('VenueMap', () => {
  const pin: MapPin = {
    venue: { id: VENUE_ID, name: { he: 'מוזס' } },
    location: { lat: 32.0641, lng: 34.7744 },
    itemCount: 3,
    bestScore: 4.6,
    writtenByMe: true,
  };

  async function render(pins: MapPin[], near: { lat: number; lng: number } | null = null) {
    const leaflet = fakeLeaflet();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        ...boundaries({ map: vi.fn().mockResolvedValue(pins), feed: vi.fn() }),
        { provide: LeafletLoader, useValue: { load: () => Promise.resolve(leaflet.L) } },
        {
          provide: DeviceLocation,
          useValue: { locate: () => Promise.resolve(near), position: () => near },
        },
      ],
    });
    TestBed.inject(I18n).setLanguage('he');
    await TestBed.inject(FeedStore).setView('map');
    const fixture = TestBed.createComponent(VenueMap);
    await fixture.whenStable();
    await vi.waitFor(() => {
      expect(leaflet.view.zoom).toBeDefined();
    });
    return { fixture, element: fixture.nativeElement as HTMLElement, ...leaflet };
  }

  it('draws a pin per venue with its best score, and fits them in view', async () => {
    const { markers, view } = await render([pin, { ...pin, bestScore: null, writtenByMe: false }]);
    expect(markers.map((marker) => marker.options.icon.html)).toEqual(['4.6', '•']);
    expect(markers[0]?.options.icon.className).toBe('menu-map-pin mine');
    expect(markers[0]?.element.getAttribute('aria-label')).toBe(
      'מוזס, 3 פריטים · הכי טוב 4.6, יש לך רשומה',
    );
    expect(view.center).toEqual(TEL_AVIV);
    expect(view.bounds).toEqual([pin.location, pin.location]);
  });

  it('opens a card for the tapped venue', async () => {
    const { fixture, element, markers } = await render([pin]);
    markers[0]?.click?.();
    await fixture.whenStable();
    expect(element.querySelector('.card h2')?.textContent).toBe('מוזס');
    expect(element.querySelector('.card p')?.textContent).toBe('3 פריטים · הכי טוב 4.6');
    expect(element.querySelector('.card a')?.getAttribute('href')).toBe(`/venues/${VENUE_ID}`);
    element.querySelector<HTMLButtonElement>('.card button')?.click();
    await fixture.whenStable();
    expect(element.querySelector('.card')).toBeNull();
  });

  it('opens a pin from the keyboard and returns focus to it on Escape', async () => {
    const { fixture, element, markers } = await render([pin]);
    const document = TestBed.inject(DOCUMENT);
    const marker = markers[0]?.element;
    marker?.setAttribute('tabindex', '0');
    document.body.appendChild(element);
    if (marker) {
      document.body.appendChild(marker);
    }
    marker?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    await fixture.whenStable();
    expect(document.activeElement?.textContent).toBe('מוזס');
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    await fixture.whenStable();
    expect(element.querySelector('.card')).toBeNull();
    expect(document.activeElement).toBe(marker);
    marker?.remove();
  });

  it('shows the user and fits them in with the pins', async () => {
    const near = { lat: 32.1, lng: 34.8 };
    const { view } = await render([pin], near);
    expect(view.me).toEqual(near);
    expect(view.bounds).toEqual([pin.location, near]);
  });

  it('removes the map when it goes, and never builds one after', async () => {
    const { fixture, remove } = await render([pin]);
    fixture.destroy();
    expect(remove).toHaveBeenCalled();

    TestBed.resetTestingModule();
    let finish: (value: unknown) => void = () => undefined;
    const late = fakeLeaflet();
    const map = vi.spyOn(late.L, 'map');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        ...boundaries({ map: vi.fn().mockResolvedValue([]) }),
        {
          provide: LeafletLoader,
          useValue: { load: () => new Promise((resolve) => (finish = resolve)) },
        },
      ],
    });
    const second = TestBed.createComponent(VenueMap);
    await second.whenStable();
    second.destroy();
    finish(late.L);
    await new Promise((resolve) => setTimeout(resolve));
    expect(map).not.toHaveBeenCalled();
  });

  it('says when no venue matches', async () => {
    const { element } = await render([]);
    expect(element.querySelector('[role=status]')?.textContent).toContain('אין מקומות');
  });
});
