import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  type Item,
  type MenuSection,
  type Tag,
  type Venue,
  type VenueInsights,
} from '@menu/shared/contracts';
import { MenuApiClient, VenueManagerStore } from '@menu/web/menus/data-access';
import { I18n } from '@menu/web/shared/util-i18n';

/** Contract-valid data for the manage specs. */
export const VENUE_ID = '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';

export const venue: Venue = {
  id: VENUE_ID,
  name: { he: 'בורגר 24', en: 'Burger 24' },
  address: 'דיזנגוף 100, תל אביב',
  location: { lat: 32.08, lng: 34.77 },
  phone: '03-1234567',
  reservationUrl: null,
  status: 'active',
  createdAt: '2026-10-01T10:00:00.000Z',
};

export const mains: MenuSection = {
  id: '5c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
  venueId: VENUE_ID,
  name: { he: 'עיקריות', en: 'Mains' },
  position: 0,
};

export const drinks: MenuSection = {
  id: '6c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
  venueId: VENUE_ID,
  name: { he: 'שתייה' },
  position: 1,
};

export const burgerTag: Tag = {
  id: '3a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  slug: 'hamburger',
  name: { he: 'המבורגר', en: 'Hamburger' },
  kind: 'dish',
};

export const classic: Item = {
  id: '7a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  venueId: VENUE_ID,
  sectionId: mains.id,
  name: { he: 'קלאסי' },
  listPrice: 6200,
  tagIds: [burgerTag.id],
  state: 'approved',
  mergedIntoId: null,
  submittedByMe: false,
  position: 0,
  createdAt: '2026-10-01T10:00:00.000Z',
};

export const lamb: Item = {
  ...classic,
  id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  name: { he: 'בורגר כבש' },
  listPrice: 7200,
  state: 'pending',
  createdAt: '2026-10-21T10:00:00.000Z',
};

export const insights: VenueInsights = {
  items: [
    {
      itemId: classic.id,
      name: classic.name,
      score: 4.5,
      ratingCount: 6,
      publicEntryCount: 4,
      otherEntryCount: 3,
      wouldOrderAgainPercent: 80,
    },
    {
      itemId: lamb.id,
      name: lamb.name,
      score: null,
      ratingCount: 0,
      publicEntryCount: 1,
      otherEntryCount: null,
      wouldOrderAgainPercent: null,
    },
  ],
};

/** A MenuApiClient stub that serves the venue above; override what a spec needs. */
export function menuApi(overrides: Partial<MenuApiClient> = {}): Partial<MenuApiClient> {
  return {
    venue: () => Promise.resolve(venue),
    sections: () => Promise.resolve([drinks, mains]),
    items: () => Promise.resolve([classic, lamb]),
    tags: () => Promise.resolve([burgerTag]),
    insights: () => Promise.resolve(insights),
    ...overrides,
  };
}

/** Sets up TestBed with a loaded VenueManagerStore, for the venue manager's parts. */
export async function loadedStore(api: Partial<MenuApiClient>): Promise<void> {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), { provide: MenuApiClient, useValue: api }, VenueManagerStore],
  });
  TestBed.inject(I18n).setLanguage('he');
  await TestBed.inject(VenueManagerStore).load(VENUE_ID);
}
