import type { he } from './venues.he';

export const en = {
  title: 'My venues',
  admin: 'Admin · every venue',
  owner: 'Owner',
  newVenue: 'New venue',
  tags: 'Tags',
  people: 'People',
  waiting: '{count, plural, =1 {1 item waits for approval} other {# items wait for approval}}',
  pending: 'To approve · {count}',
  hidden: 'Hidden',
  empty: 'No venues yet.',
  loading: 'Loading…',
  loadFailed: 'Could not load the venues.',
  retry: 'Try again',
} satisfies typeof he;
