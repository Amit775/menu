import { i18nScope } from '@menu/web/shared/util-i18n';

export const tagsI18n = i18nScope('menusTags', {
  he: () => import('./i18n/tags.he').then((strings) => strings.he),
  en: () => import('./i18n/tags.en').then((strings) => strings.en),
});
