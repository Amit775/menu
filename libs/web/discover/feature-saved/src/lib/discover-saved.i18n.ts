import { i18nScope } from '@menu/web/shared/util-i18n';

export const discoverSavedI18n = i18nScope('discoverSaved', {
  he: () => import('./i18n/discover-saved.he').then((strings) => strings.he),
  en: () => import('./i18n/discover-saved.en').then((strings) => strings.en),
});
