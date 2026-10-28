import type { he } from './ui.he';

export const en = {
  entries: '{count, plural, =1 {1 entry} other {# entries}}',
  wouldOrderAgain: '{percent}% would order again',
  noScore: 'No score yet',
  scoreLabel: 'Score {score} out of 5',
  beFirst: 'Be the first',
  writtenByMe: 'You wrote about this',
  historyTitle: 'History',
  historyAdded: 'Added to the menu',
  historyAddedAt: 'Added to the menu at {price}',
  historyArchived: 'Taken off the menu',
  historyRenamed: 'Renamed from {from}',
  historyDescription: 'Description updated',
  historyPrice: 'Price changed from {from} to {to}',
  historyPriceSet: 'Price set to {to}',
  historyPriceRemoved: 'Price removed',
  historyMoved: 'Moved to {to}',
  historyMovedUnnamed: 'Moved to another section',
  historyTagged: 'Tagged {tags}',
  historyUntagged: 'No longer tagged {tags}',
} satisfies typeof he;
