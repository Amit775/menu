import { type Route } from '@angular/router';

// Feature libs register lazy routes here (the feature-lib generator adds them).
export const appRoutes: Route[] = [
  {
    path: 'profile',
    loadChildren: () =>
      import('@menu/web/users/feature-profile').then((m) => m.webUsersFeatureProfileRoutes),
  },
  {
    path: 'sign-in',
    loadChildren: () =>
      import('@menu/web/users/feature-sign-in').then((m) => m.webUsersFeatureSignInRoutes),
  },
  {
    path: 'items/:id',
    loadChildren: () =>
      import('@menu/web/discover/feature-item').then((m) => m.webDiscoverFeatureItemRoutes),
  },
  {
    path: 'venues/:id',
    loadChildren: () =>
      import('@menu/web/discover/feature-venue').then((m) => m.webDiscoverFeatureVenueRoutes),
  },
  {
    path: '',
    pathMatch: 'full',
    loadChildren: () =>
      import('@menu/web/discover/feature-feed').then((m) => m.webDiscoverFeatureFeedRoutes),
  },
];
