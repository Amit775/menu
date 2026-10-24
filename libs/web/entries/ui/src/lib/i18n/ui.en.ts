import type { he } from './ui.he';

export const en = {
  yourEntry: 'Your entry',
  anonymous: 'A user',
  rating: 'Rated {rating} out of 5',
  wouldOrderAgain: 'Would order again',
  wouldNotOrderAgain: 'Would not order again',
  paid: 'Paid {price}',
  hidden: 'Hidden by an Admin. Only you can see it.',
  photo: 'Photo from the entry',
  ratingLegend: 'Rating',
  optional: '(optional)',
  clearRating: 'Clear rating',
  stars: '{count, plural, =1 {1 star} other {# stars}}',
  visibilityName: '{visibility, select, private {private} shared {link only} other {public}}',
} satisfies typeof he;
