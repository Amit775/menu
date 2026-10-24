import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type Item,
  type MenuSection,
  type Tag,
  type Venue,
  type VenueInsights,
} from '@menu/shared/contracts';

/** Contract-valid data for the menus specs. */
export const VENUE_ID = '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';

export const venue: Venue = {
  id: VENUE_ID,
  name: { he: 'מוזס', en: 'Moses' },
  address: 'רוטשילד 35, תל אביב',
  location: { lat: 32.0641, lng: 34.7744 },
  phone: null,
  reservationUrl: null,
  status: 'active',
  createdAt: '2026-10-01T10:00:00.000Z',
};

export const section: MenuSection = {
  id: '5c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
  venueId: VENUE_ID,
  name: { he: 'עיקריות', en: 'Mains' },
  position: 0,
};

export const item: Item = {
  id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  venueId: VENUE_ID,
  sectionId: section.id,
  name: { he: 'שקשוקה' },
  listPrice: 5400,
  tagIds: [],
  state: 'pending',
  mergedIntoId: null,
  submittedByMe: true,
  position: 0,
  createdAt: '2026-10-23T10:00:00.000Z',
};

export const tag: Tag = {
  id: '3a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  slug: 'hamburger',
  name: { he: 'המבורגר', en: 'Hamburger' },
  kind: 'dish',
};

export const insights: VenueInsights = {
  items: [
    {
      itemId: item.id,
      name: item.name,
      score: 4.5,
      ratingCount: 6,
      publicEntryCount: 4,
      otherEntryCount: null,
      wouldOrderAgainPercent: 80,
    },
  ],
};

export function settle(): Promise<void> {
  return TestBed.inject(ApplicationRef).whenStable();
}
