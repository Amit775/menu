import { i18nScope } from '@menu/web/shared/util-i18n';

export const itemI18n = i18nScope('discoverItem', {
  he: () => import('./i18n/item.he').then((strings) => strings.he),
  en: () => import('./i18n/item.en').then((strings) => strings.en),
});
