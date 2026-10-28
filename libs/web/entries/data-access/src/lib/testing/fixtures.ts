import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  type Entry,
  type ItemEntries,
  type ItemRef,
  type PersonalStats,
  type PublicEntry,
} from '@menu/shared/contracts';

export const ITEM_ID = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
export const VENUE_ID = '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';

export const itemRef: ItemRef = {
  id: ITEM_ID,
  name: { he: 'המבורגר הקלאסי', en: 'Classic burger' },
  listPrice: { value: 68, currency: 'ILS' as const },
  variations: [],
  venue: { id: VENUE_ID, name: { he: 'בורגר 24', en: 'Burger 24' } },
};

export const entry: Entry = {
  id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  itemId: ITEM_ID,
  variationId: null,
  venueId: VENUE_ID,
  eatenAt: '2026-10-20T19:30:00.000Z',
  rating: 5,
  wouldOrderAgain: true,
  pricePaid: { value: 62, currency: 'ILS' as const },
  text: 'מדיום מושלם',
  visibility: 'private',
  shareToken: null,
  hidden: false,
  photoUrl: null,
  createdAt: '2026-10-20T20:00:00.000Z',
  updatedAt: '2026-10-20T20:00:00.000Z',
};

export const publicEntry: PublicEntry = {
  id: '1e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  itemId: ITEM_ID,
  variationId: null,
  venueId: VENUE_ID,
  eatenAt: '2026-10-19T19:30:00.000Z',
  rating: 4,
  wouldOrderAgain: null,
  pricePaid: null,
  text: 'טוב מאוד',
  authorName: 'דנה',
  photoUrl: null,
  createdAt: '2026-10-19T20:00:00.000Z',
};

export const sheet: ItemEntries = {
  item: itemRef,
  itemIsPublic: true,
  savedByMe: false,
  mine: [entry],
  others: [publicEntry],
};

export const stats: PersonalStats = {
  entryCount: 3,
  venueCount: 1,
  itemCount: 1,
  averageRating: 4.5,
  months: [
    { month: '2026-09', entryCount: 1, spent: [] },
    { month: '2026-10', entryCount: 2, spent: [{ value: 124, currency: 'ILS' as const }] },
  ],
  topTags: [{ name: { he: 'בשרי', en: 'Meat' }, count: 3 }],
  mostOrdered: { item: itemRef, count: 3 },
};

export function settle(): Promise<void> {
  return TestBed.inject(ApplicationRef).whenStable();
}
