import type { he } from './diary.he';

export const en = {
  title: 'My diary',
  back: 'Back',
  count: '{count, plural, =1 {1 entry} other {# entries}}',
  empty: 'Your diary is empty. Every item in discover starts with "I had this".',
  toFeed: 'To discover',
  edit: 'Edit',
  at: '· at {venue}',
  all: 'Whole diary',
  noVenue: 'No entries from this place.',
  loading: 'Loading…',
  loadFailed: 'Could not load your diary.',
  retry: 'Try again',
} satisfies typeof he;
