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
];
