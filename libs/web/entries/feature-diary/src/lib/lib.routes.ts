import { type Route } from '@angular/router';
import { signedInGuard } from '@menu/web/shared/util-auth';
import { EntriesDiaryPage } from './entries-diary-page/entries-diary-page';

export const webEntriesFeatureDiaryRoutes: Route[] = [
  { path: '', component: EntriesDiaryPage, canActivate: [signedInGuard] },
];
