import { defineMessages } from '@menu/web/shared/util-i18n';

export const sharedMessages = defineMessages({
  he: {
    brand: 'menu',
    signIn: 'כניסה',
    photo: 'התמונה מהרשומה',
    sharedBy: (name: string) => (name ? `${name} שיתף/ה איתך רשומה` : 'שיתפו איתך רשומה'),
    rating: (rating: number) => `★ ${String(rating)}`,
    ratingLabel: (rating: number) => `דירוג ${String(rating)} מתוך 5`,
    wouldOrderAgain: 'יזמין שוב',
    wouldNotOrderAgain: 'לא יזמין שוב',
    paid: (price: string) => `שולם ${price}`,
    promptTitle: 'שמרו לעצמכם מה אכלתם',
    promptText: 'פרטי כברירת מחדל. מה הזמנתם, כמה זה עלה, והאם תזמינו שוב.',
    promptAction: 'להרשמה',
    whatEveryoneSays: (item: string) => `${item}: מה כולם אומרים`,
    privateNow: 'הרשומה הזאת פרטית עכשיו.',
    removed: 'הרשומה הזאת הוסרה.',
    toFeed: 'לגילוי',
    footer: (name: string) =>
      name
        ? `${name} בחר/ה לשתף את הרשומה הזאת. שאר הרשומות נשארות פרטיות.`
        : 'שאר הרשומות נשארות פרטיות.',
    loading: 'טוען…',
    loadFailed: 'לא הצלחנו לטעון את הרשומה.',
    retry: 'לנסות שוב',
  },
  en: {
    brand: 'menu',
    signIn: 'Sign in',
    photo: 'The photo from the entry',
    sharedBy: (name: string) =>
      name ? `${name} shared a note with you` : 'A note shared with you',
    rating: (rating: number) => `★ ${String(rating)}`,
    ratingLabel: (rating: number) => `Rated ${String(rating)} out of 5`,
    wouldOrderAgain: 'Would order again',
    wouldNotOrderAgain: 'Would not order again',
    paid: (price: string) => `Paid ${price}`,
    promptTitle: 'Keep your own notes on what you eat',
    promptText:
      'Private by default. Remember what you ordered, what it cost, and whether you would order it again.',
    promptAction: 'Sign up',
    whatEveryoneSays: (item: string) => `${item}, what everyone says`,
    privateNow: 'This note is private now.',
    removed: 'This note was removed.',
    toFeed: 'To discover',
    footer: (name: string) =>
      name
        ? `${name} chose to share this note. Their other notes stay private.`
        : 'Their other notes stay private.',
    loading: 'Loading…',
    loadFailed: 'Could not load this note.',
    retry: 'Try again',
  },
});
