import { i18nScope } from '@menu/web/shared/util-i18n';

export const diaryI18n = i18nScope('entriesDiary', {
  he: () => import('./i18n/diary.he').then((strings) => strings.he),
  en: () => import('./i18n/diary.en').then((strings) => strings.en),
});
