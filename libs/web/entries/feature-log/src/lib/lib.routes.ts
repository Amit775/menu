import { type Route } from '@angular/router';
import { signedInGuard } from '@menu/web/shared/util-auth';
import { EntriesLogPage } from './entries-log-page/entries-log-page';

export const webEntriesFeatureLogRoutes: Route[] = [
  { path: ':itemId', component: EntriesLogPage, canActivate: [signedInGuard] },
  { path: ':itemId/:entryId', component: EntriesLogPage, canActivate: [signedInGuard] },
];
