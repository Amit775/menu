import type { he } from './shared.he';

export const en = {
  brand: 'menu',
  signIn: 'Sign in',
  photo: 'The photo from the entry',
  sharedBy: '{name} shared a note with you',
  rating: '★ {rating}',
  ratingLabel: 'Rated {rating} out of 5',
  wouldOrderAgain: 'Would order again',
  wouldNotOrderAgain: 'Would not order again',
  paid: 'Paid {price}',
  promptTitle: 'Keep your own notes on what you eat',
  promptText:
    'Private by default. Remember what you ordered, what it cost, and whether you would order it again.',
  promptAction: 'Sign up',
  whatEveryoneSays: '{item}, what everyone says',
  privateNow: 'This note is private now.',
  removed: 'This note was removed.',
  toFeed: 'To discover',
  footer: '{name} chose to share this note. Their other notes stay private.',
  loading: 'Loading…',
  loadFailed: 'Could not load this note.',
  retry: 'Try again',
  sharedByAnonymous: 'A note shared with you',
  footerAnonymous: 'Their other notes stay private.',
} satisfies typeof he;
