import { type Route } from '@angular/router';

// Feature libs register lazy routes here (the feature-lib generator adds them).
export const appRoutes: Route[] = [
  {
    path: 'manage',
    loadChildren: () =>
      import('@menu/web/menus/feature-manage').then((m) => m.webMenusFeatureManageRoutes),
  },
  {
    path: 'venues/:id/add-item',
    loadChildren: () =>
      import('@menu/web/menus/feature-add-item').then((m) => m.webMenusFeatureAddItemRoutes),
  },
  {
    path: 'e/:token',
    loadChildren: () =>
      import('@menu/web/entries/feature-shared').then((m) => m.webEntriesFeatureSharedRoutes),
  },
  {
    path: 'diary',
    loadChildren: () =>
      import('@menu/web/entries/feature-diary').then((m) => m.webEntriesFeatureDiaryRoutes),
  },
  {
    path: 'items/:id/entries',
    loadChildren: () =>
      import('@menu/web/entries/feature-sheet').then((m) => m.webEntriesFeatureSheetRoutes),
  },
  {
    path: 'log',
    loadChildren: () =>
      import('@menu/web/entries/feature-log').then((m) => m.webEntriesFeatureLogRoutes),
  },
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
