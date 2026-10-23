import {
  type Entry,
  type ItemEntries,
  type ItemRef,
  type PublicEntry,
} from '@menu/shared/contracts';

/** Contract-valid data for the entries specs. */
export const ITEM_ID = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
export const VENUE_ID = '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';

export const itemRef: ItemRef = {
  id: ITEM_ID,
  name: { he: 'המבורגר הקלאסי', en: 'Classic burger' },
  listPrice: 6800,
  venue: { id: VENUE_ID, name: { he: 'בורגר 24', en: 'Burger 24' } },
};

export const entry: Entry = {
  id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  itemId: ITEM_ID,
  venueId: VENUE_ID,
  eatenAt: '2026-10-20T19:30:00.000Z',
  rating: 5,
  wouldOrderAgain: true,
  pricePaid: 6200,
  text: 'מדיום מושלם',
  visibility: 'private',
  shareToken: null,
  hidden: false,
  createdAt: '2026-10-20T20:00:00.000Z',
  updatedAt: '2026-10-20T20:00:00.000Z',
};

export const publicEntry: PublicEntry = {
  id: '1e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  itemId: ITEM_ID,
  venueId: VENUE_ID,
  eatenAt: '2026-10-19T19:30:00.000Z',
  rating: 4,
  wouldOrderAgain: null,
  pricePaid: null,
  text: 'טוב מאוד',
  authorName: 'דנה',
  createdAt: '2026-10-19T20:00:00.000Z',
};

export const sheet: ItemEntries = { item: itemRef, mine: [entry], others: [publicEntry] };
