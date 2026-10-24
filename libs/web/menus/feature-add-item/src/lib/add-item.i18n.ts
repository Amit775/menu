import { i18nScope } from '@menu/web/shared/util-i18n';

export const addItemI18n = i18nScope('menusAddItem', {
  he: () => import('./i18n/add-item.he').then((strings) => strings.he),
  en: () => import('./i18n/add-item.en').then((strings) => strings.en),
});
