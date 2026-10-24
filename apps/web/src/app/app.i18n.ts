import { i18nScope } from '@menu/web/shared/util-i18n';

export const appI18n = i18nScope('app', {
  he: () => import('./i18n/app.he').then((strings) => strings.he),
  en: () => import('./i18n/app.en').then((strings) => strings.en),
});
