import { i18nScope } from '@menu/web/shared/util-i18n';

export const sheetI18n = i18nScope('entriesSheet', {
  he: () => import('./i18n/sheet.he').then((strings) => strings.he),
  en: () => import('./i18n/sheet.en').then((strings) => strings.en),
});
