import { i18nScope } from '@menu/web/shared/util-i18n';

export const sharedI18n = i18nScope('entriesShared', {
  he: () => import('./i18n/shared.he').then((strings) => strings.he),
  en: () => import('./i18n/shared.en').then((strings) => strings.en),
});
