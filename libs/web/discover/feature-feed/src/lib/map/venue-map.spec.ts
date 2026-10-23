import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type MapPin } from '@menu/shared/contracts';
import { FeedStore } from '@menu/web/discover/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { boundaries, VENUE_ID } from '../testing/feed-fixtures';
import { LeafletLoader } from './leaflet-loader';
import { TEL_AVIV, VenueMap } from './venue-map';

interface FakeMarker {
  location: unknown;
  options: { title: string; icon: { html: string; className: string } };
  click?: () => void;
}

/** Just enough of Leaflet to see what the map draws. */
function fakeLeaflet() {
  const markers: FakeMarker[] = [];
  const view: { center?: unknown; zoom?: number; bounds?: unknown } = {};
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
        remove: vi.fn(),
      };
      return map;
    },
    tileLayer: () => chain,
    circleMarker: () => chain,
    layerGroup: () => {
      const group = { addTo: () => group, clearLayers: () => markers.splice(0) };
      return group;
    },
    divIcon: (options: unknown) => options,
    latLngBounds: (points: unknown) => points,
    marker: (location: unknown, options: FakeMarker['options']) => {
      const marker: FakeMarker = { location, options };
      const api = {
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
  return { L, markers, view };
}

describe('VenueMap', () => {
  const pin: MapPin = {
    venue: { id: VENUE_ID, name: { he: 'מוזס' } },
    location: { lat: 32.0641, lng: 34.7744 },
    itemCount: 3,
    bestScore: 4.6,
    writtenByMe: true,
  };

  async function render(pins: MapPin[]) {
    const leaflet = fakeLeaflet();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        ...boundaries({ map: vi.fn().mockResolvedValue(pins), feed: vi.fn() }),
        { provide: LeafletLoader, useValue: { load: () => Promise.resolve(leaflet.L) } },
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
    expect(markers[0]?.options.title).toBe('מוזס');
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

  it('says when no venue matches', async () => {
    const { element } = await render([]);
    expect(element.querySelector('[role=status]')?.textContent).toContain('אין מקומות');
  });
});
