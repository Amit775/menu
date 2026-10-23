import { defineMessages } from '@menu/web/shared/util-i18n';

export const discoverUiMessages = defineMessages({
  he: {
    entries: (count: number) => (count === 1 ? 'רשומה אחת' : `${String(count)} רשומות`),
    wouldOrderAgain: (percent: number) => `${String(percent)}% יזמינו שוב`,
    noScore: 'אין עדיין ציון',
    scoreLabel: (score: string) => `ציון ${score} מתוך 5`,
    beFirst: 'היו הראשונים',
    writtenByMe: 'יש לך רשומה',
    priceHistory: 'מחיר לאורך זמן',
    month: (month: string) =>
      new Intl.DateTimeFormat('he', { month: 'short', timeZone: 'UTC' }).format(
        new Date(`${month}-01`),
      ),
  },
  en: {
    entries: (count: number) => (count === 1 ? '1 entry' : `${String(count)} entries`),
    wouldOrderAgain: (percent: number) => `${String(percent)}% would order again`,
    noScore: 'No score yet',
    scoreLabel: (score: string) => `Score ${score} out of 5`,
    beFirst: 'Be the first',
    writtenByMe: 'You wrote about this',
    priceHistory: 'Price over time',
    month: (month: string) =>
      new Intl.DateTimeFormat('en', { month: 'short', timeZone: 'UTC' }).format(
        new Date(`${month}-01`),
      ),
  },
});
