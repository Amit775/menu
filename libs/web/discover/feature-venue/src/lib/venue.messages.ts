import { defineMessages } from '@menu/web/shared/util-i18n';

export const venueMessages = defineMessages({
  he: {
    back: 'חזרה',
    loadFailed: 'לא הצלחנו לטעון את המקום.',
    retry: 'לנסות שוב',
    notFound: 'המקום הזה לא נמצא.',
    toFeed: 'לגילוי',
    navigate: 'ניווט',
    call: 'חיוג',
    reserve: 'הזמנת מקום',
    myEntries: (count: number) =>
      count === 1 ? 'רשומה אחת שלך כאן' : `${String(count)} רשומות שלך כאן`,
    topItems: 'מה טעים כאן',
    menu: 'התפריט',
    emptyMenu: 'התפריט עוד לא הוזן.',
  },
  en: {
    back: 'Back',
    loadFailed: 'Could not load this place.',
    retry: 'Try again',
    notFound: 'This place was not found.',
    toFeed: 'To discover',
    navigate: 'Navigate',
    call: 'Call',
    reserve: 'Reserve',
    myEntries: (count: number) =>
      count === 1 ? 'You have 1 entry here' : `You have ${String(count)} entries here`,
    topItems: 'What is good here',
    menu: 'Menu',
    emptyMenu: 'The menu is not in yet.',
  },
});
