import { type Route } from '@angular/router';
import { signedInGuard } from '@menu/web/shared/util-auth';
import { DiscoverSavedPage } from './discover-saved-page/discover-saved-page';

export const webDiscoverFeatureSavedRoutes: Route[] = [
  { path: '', component: DiscoverSavedPage, canActivate: [signedInGuard] },
];
