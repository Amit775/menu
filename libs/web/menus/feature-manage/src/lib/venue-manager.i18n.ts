import { i18nScope } from '@menu/web/shared/util-i18n';

export const venueManagerI18n = i18nScope('menusVenueManager', {
  he: () => import('./i18n/venue-manager.he').then((strings) => strings.he),
  en: () => import('./i18n/venue-manager.en').then((strings) => strings.en),
});
