import { type Route } from '@angular/router';
import { adminGuard, managerGuard } from '@menu/web/shared/util-auth';
import { ItemFormPage } from './item-form-page/item-form-page';
import { MenusManagePage } from './menus-manage-page/menus-manage-page';
import { TagsPage } from './tags-page/tags-page';
import { VenueFormPage } from './venue-form-page/venue-form-page';
import { VenueManagerPage } from './venue-manager-page/venue-manager-page';

export const webMenusFeatureManageRoutes: Route[] = [
  {
    path: '',
    canActivate: [managerGuard],
    children: [
      { path: '', component: MenusManagePage },
      { path: 'venues/new', component: VenueFormPage, canActivate: [adminGuard] },
      { path: 'venues/:id', component: VenueManagerPage },
      { path: 'venues/:id/edit', component: VenueFormPage, canActivate: [adminGuard] },
      { path: 'tags', component: TagsPage, canActivate: [adminGuard] },
      { path: 'venues/:id/items/new', component: ItemFormPage },
      { path: 'venues/:id/items/:itemId', component: ItemFormPage },
    ],
  },
];
