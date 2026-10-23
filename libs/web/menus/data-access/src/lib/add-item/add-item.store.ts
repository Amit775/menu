import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { type CreateItem, type Item, type MenuSection, type Venue } from '@menu/shared/contracts';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { MenuApiClient } from '../menu/menu.api-client';

export type AddItemStatus = 'loading' | 'loaded' | 'not-found' | 'error';

interface AddItemState {
  venue: Venue | null;
  sections: MenuSection[];
  status: AddItemStatus;
}

/** J4: a venue and its sections, to propose an item missing from its menu. Provide it in the routed page. */
export const AddItemStore = signalStore(
  withState<AddItemState>({ venue: null, sections: [], status: 'loading' }),
  withMethods((store, api = inject(MenuApiClient)) => ({
    async load(venueId: string): Promise<void> {
      patchState(store, { status: 'loading' });
      try {
        const [venue, sections] = await Promise.all([api.venue(venueId), api.sections(venueId)]);
        patchState(store, { venue, sections, status: 'loaded' });
      } catch (error) {
        const missing =
          error instanceof HttpErrorResponse && (error.status === 404 || error.status === 400);
        patchState(store, { status: missing ? 'not-found' : 'error' });
      }
    },
    /** Rejects when the API refuses; the caller shows why. */
    add(input: Pick<CreateItem, 'sectionId' | 'name' | 'listPrice'>): Promise<Item> {
      const venue = store.venue();
      if (!venue) {
        return Promise.reject(new Error('Load the venue first.'));
      }
      return api.addItem(venue.id, input);
    },
  })),
);
