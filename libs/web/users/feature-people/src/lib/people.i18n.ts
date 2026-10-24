import { i18nScope } from '@menu/web/shared/util-i18n';

export const peopleI18n = i18nScope('usersPeople', {
  he: () => import('./i18n/people.he').then((strings) => strings.he),
  en: () => import('./i18n/people.en').then((strings) => strings.en),
});
