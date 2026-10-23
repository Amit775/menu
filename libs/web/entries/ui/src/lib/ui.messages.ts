import { defineMessages } from '@menu/web/shared/util-i18n';

export const entriesUiMessages = defineMessages({
  he: {
    yourEntry: 'הרשומה שלך',
    visibility: { private: 'פרטית', shared: 'בקישור', public: 'ציבורית' },
    anonymous: 'משתמש',
    rating: (rating: number) => `דירוג ${String(rating)} מתוך 5`,
    wouldOrderAgain: 'יזמין שוב',
    wouldNotOrderAgain: 'לא יזמין שוב',
    paid: (price: string) => `שולם ${price}`,
    hidden: 'הוסתרה על ידי מנהל. רק את/ה רואה אותה.',
    ratingLegend: 'דירוג',
    optional: '(לא חובה)',
    stars: (rating: number) => (rating === 1 ? 'כוכב אחד' : `${String(rating)} כוכבים`),
  },
  en: {
    yourEntry: 'Your entry',
    visibility: { private: 'private', shared: 'link only', public: 'public' },
    anonymous: 'A user',
    rating: (rating: number) => `Rated ${String(rating)} out of 5`,
    wouldOrderAgain: 'Would order again',
    wouldNotOrderAgain: 'Would not order again',
    paid: (price: string) => `Paid ${price}`,
    hidden: 'Hidden by an Admin. Only you can see it.',
    ratingLegend: 'Rating',
    optional: '(optional)',
    stars: (rating: number) => (rating === 1 ? '1 star' : `${String(rating)} stars`),
  },
});
