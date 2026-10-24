import { i18nScope } from '@menu/web/shared/util-i18n';

export const feedI18n = i18nScope('discoverFeed', {
  he: () => import('./i18n/feed.he').then((strings) => strings.he),
  en: () => import('./i18n/feed.en').then((strings) => strings.en),
});
