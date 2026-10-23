import { type Route } from '@angular/router';
import { signedInGuard } from '@menu/web/shared/util-auth';
import { MenusAddItemPage } from './menus-add-item-page/menus-add-item-page';

export const webMenusFeatureAddItemRoutes: Route[] = [
  { path: '', component: MenusAddItemPage, canActivate: [signedInGuard] },
];
