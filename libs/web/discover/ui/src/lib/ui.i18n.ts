import { i18nScope } from '@menu/web/shared/util-i18n';

export const uiI18n = i18nScope('discoverUi', {
  he: () => import('./i18n/ui.he').then((strings) => strings.he),
  en: () => import('./i18n/ui.en').then((strings) => strings.en),
});
