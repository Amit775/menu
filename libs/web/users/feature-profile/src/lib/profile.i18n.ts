import { i18nScope } from '@menu/web/shared/util-i18n';

export const profileI18n = i18nScope('usersProfile', {
  he: () => import('./i18n/profile.he').then((strings) => strings.he),
  en: () => import('./i18n/profile.en').then((strings) => strings.en),
});
