import type { he } from './item.he';

export const en = {
  back: 'Back',
  loading: 'Loading…',
  share: 'Share',
  copied: 'Link copied',
  loadFailed: 'Could not load this item.',
  retry: 'Try again',
  notFound: 'This item was not found.',
  toFeed: 'To discover',
  archived: 'This item is no longer on the menu.',
  entries: '{count, plural, =1 {1 entry} other {# entries}}',
  noScore:
    '{count, plural, =0 {No ratings yet. Be the first.} other {Not enough ratings for a score yet.}}',
  wouldOrderAgain: 'would order again',
  percent: '{value}%',
  latestPrice: 'latest price',
  ratings: 'ratings',
  alsoGoodAt: 'Also good at {venue}',
  whatPeopleSay: 'What people say',
  allEntries: 'All entries',
  logIt: 'I had this',
} satisfies typeof he;
