import { type Route } from '@angular/router';
import { managerGuard } from '@menu/web/shared/util-auth';
import { MenusManagePage } from './menus-manage-page/menus-manage-page';
import { VenueManagerPage } from './venue-manager-page/venue-manager-page';

export const webMenusFeatureManageRoutes: Route[] = [
  {
    path: '',
    canActivate: [managerGuard],
    children: [
      { path: '', component: MenusManagePage },
      { path: 'venues/:id', component: VenueManagerPage },
    ],
  },
];
