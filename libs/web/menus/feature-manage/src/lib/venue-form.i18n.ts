import { i18nScope } from '@menu/web/shared/util-i18n';

export const venueFormI18n = i18nScope('menusVenueForm', {
  he: () => import('./i18n/venue-form.he').then((strings) => strings.he),
  en: () => import('./i18n/venue-form.en').then((strings) => strings.en),
});
