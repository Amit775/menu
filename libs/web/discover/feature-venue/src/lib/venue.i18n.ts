import { i18nScope } from '@menu/web/shared/util-i18n';

export const venueI18n = i18nScope('discoverVenue', {
  he: () => import('./i18n/venue.he').then((strings) => strings.he),
  en: () => import('./i18n/venue.en').then((strings) => strings.en),
});
