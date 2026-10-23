import { defineMessages } from '@menu/web/shared/util-i18n';

export const itemMessages = defineMessages({
  he: {
    back: 'חזרה',
    loading: 'טוען…',
    share: 'שיתוף',
    copied: 'הקישור הועתק',
    loadFailed: 'לא הצלחנו לטעון את הפריט.',
    retry: 'לנסות שוב',
    notFound: 'הפריט הזה לא נמצא.',
    toFeed: 'לגילוי',
    archived: 'הפריט כבר לא בתפריט.',
    entries: (count: number) => (count === 1 ? 'רשומה אחת' : `${String(count)} רשומות`),
    noScore: (count: number) =>
      count === 0 ? 'עדיין אין דירוגים. היו הראשונים.' : 'עדיין אין מספיק דירוגים לציון.',
    wouldOrderAgain: 'יזמינו שוב',
    percent: (value: number) => `${String(value)}%`,
    latestPrice: 'מחיר אחרון',
    ratings: 'דירוגים',
    alsoGoodAt: (venue: string) => `עוד טעים ב${venue}`,
  },
  en: {
    back: 'Back',
    loading: 'Loading…',
    share: 'Share',
    copied: 'Link copied',
    loadFailed: 'Could not load this item.',
    retry: 'Try again',
    notFound: 'This item was not found.',
    toFeed: 'To discover',
    archived: 'This item is no longer on the menu.',
    entries: (count: number) => (count === 1 ? '1 entry' : `${String(count)} entries`),
    noScore: (count: number) =>
      count === 0 ? 'No ratings yet. Be the first.' : 'Not enough ratings for a score yet.',
    wouldOrderAgain: 'would order again',
    percent: (value: number) => `${String(value)}%`,
    latestPrice: 'latest price',
    ratings: 'ratings',
    alsoGoodAt: (venue: string) => `Also good at ${venue}`,
  },
});
