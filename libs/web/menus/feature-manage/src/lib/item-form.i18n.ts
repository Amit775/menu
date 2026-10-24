import { i18nScope } from '@menu/web/shared/util-i18n';

export const itemFormI18n = i18nScope('menusItemForm', {
  he: () => import('./i18n/item-form.he').then((strings) => strings.he),
  en: () => import('./i18n/item-form.en').then((strings) => strings.en),
});
