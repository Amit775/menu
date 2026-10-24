import { defineMessages } from '@menu/web/shared/util-i18n';

export const venuesMessages = defineMessages({
  he: {
    title: 'המקומות שלי',
    admin: 'מנהל · כל המקומות',
    owner: 'בעלים',
    newVenue: 'מקום חדש',
    tags: 'תגיות',
    people: 'אנשים',
    waiting: (count: number) =>
      count === 1 ? 'פריט אחד ממתין לאישור' : `${String(count)} פריטים ממתינים לאישור`,
    pending: (count: number) => `לאישור · ${String(count)}`,
    hidden: 'מוסתר',
    empty: 'עוד אין מקומות.',
    loading: 'טוען…',
    loadFailed: 'לא הצלחנו לטעון את המקומות.',
    retry: 'לנסות שוב',
  },
  en: {
    title: 'My venues',
    admin: 'Admin · every venue',
    owner: 'Owner',
    newVenue: 'New venue',
    tags: 'Tags',
    people: 'People',
    waiting: (count: number) =>
      count === 1 ? '1 item waits for approval' : `${String(count)} items wait for approval`,
    pending: (count: number) => `To approve · ${String(count)}`,
    hidden: 'Hidden',
    empty: 'No venues yet.',
    loading: 'Loading…',
    loadFailed: 'Could not load the venues.',
    retry: 'Try again',
  },
});
