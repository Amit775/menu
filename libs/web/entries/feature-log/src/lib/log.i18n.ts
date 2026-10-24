import { i18nScope } from '@menu/web/shared/util-i18n';

export const logI18n = i18nScope('entriesLog', {
  he: () => import('./i18n/log.he').then((strings) => strings.he),
  en: () => import('./i18n/log.en').then((strings) => strings.en),
});
