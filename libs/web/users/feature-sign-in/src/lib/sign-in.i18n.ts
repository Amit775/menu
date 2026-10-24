import { i18nScope } from '@menu/web/shared/util-i18n';

export const signInI18n = i18nScope('usersSignIn', {
  he: () => import('./i18n/sign-in.he').then((strings) => strings.he),
  en: () => import('./i18n/sign-in.en').then((strings) => strings.en),
});
