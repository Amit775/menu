import { defineMessages } from '@menu/web/shared/util-i18n';

export const diaryMessages = defineMessages({
  he: {
    title: 'היומן שלי',
    back: 'חזרה',
    count: (count: number) => (count === 1 ? 'רשומה אחת' : `${String(count)} רשומות`),
    empty: 'היומן עוד ריק. כל פריט בגילוי מתחיל ב״אכלתי״.',
    toFeed: 'לגילוי',
    edit: 'עריכה',
    loading: 'טוען…',
    loadFailed: 'לא הצלחנו לטעון את היומן.',
    retry: 'לנסות שוב',
  },
  en: {
    title: 'My diary',
    back: 'Back',
    count: (count: number) => (count === 1 ? '1 entry' : `${String(count)} entries`),
    empty: 'Your diary is empty. Every item in discover starts with "I had this".',
    toFeed: 'To discover',
    edit: 'Edit',
    loading: 'Loading…',
    loadFailed: 'Could not load your diary.',
    retry: 'Try again',
  },
});
