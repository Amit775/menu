import { type Route } from '@angular/router';
import { EntriesSharedPage } from './entries-shared-page/entries-shared-page';

/** `/e/:token`: open to anyone holding the link. */
export const webEntriesFeatureSharedRoutes: Route[] = [{ path: '', component: EntriesSharedPage }];
