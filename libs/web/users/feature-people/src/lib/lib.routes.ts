import { type Route } from '@angular/router';
import { adminGuard } from '@menu/web/shared/util-auth';
import { UsersPeoplePage } from './users-people-page/users-people-page';
import { VenueOwnersPage } from './venue-owners-page/venue-owners-page';

export const webUsersFeaturePeopleRoutes: Route[] = [
  {
    path: '',
    canActivate: [adminGuard],
    children: [
      { path: '', component: UsersPeoplePage },
      { path: 'owners/:venueId', component: VenueOwnersPage },
    ],
  },
];
