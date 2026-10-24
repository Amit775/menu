import type { he } from './add-item.he';

export const en = {
  title: 'Not on the menu?',
  intro:
    'Add the item to {venue}. Until the venue approves it, only you see it. The entry form opens next.',
  cancel: 'Cancel',
  name: 'Item name',
  nameRequired: 'A name is needed',
  section: 'Where on the menu',
  sectionRequired: 'Pick a part of the menu',
  price: 'Menu price (optional)',
  priceInvalid: 'Whole shekels',
  noSections: 'This venue’s menu has no sections yet, so items cannot be added.',
  save: 'Add and write about it',
  saving: 'Saving…',
  saveFailed: 'Could not add the item. Try again.',
  loading: 'Loading…',
  loadFailed: 'Could not load this place.',
  retry: 'Try again',
  notFound: 'This place was not found.',
  toFeed: 'To discover',
} satisfies typeof he;
