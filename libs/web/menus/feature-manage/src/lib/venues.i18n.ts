import { i18nScope } from '@menu/web/shared/util-i18n';

export const venuesI18n = i18nScope('menusVenues', {
  he: () => import('./i18n/venues.he').then((strings) => strings.he),
  en: () => import('./i18n/venues.en').then((strings) => strings.en),
});
