import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { type ItemPage, type VenuePage } from '@menu/shared/contracts';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DiscoverApiClient } from '../api/discover.api-client';
import { DeviceLocation } from '../location/device-location';

export type PageStatus = 'loading' | 'loaded' | 'not-found' | 'error';

/** A 404, or a 400 for an id that is not one (`/items/foo`), means there is nothing to retry. */
function failure(error: unknown): PageStatus {
  return error instanceof HttpErrorResponse && (error.status === 404 || error.status === 400)
    ? 'not-found'
    : 'error';
}

interface ItemPageState {
  page: ItemPage | null;
  status: PageStatus;
}

/** One item's page. Provide it in the routed page. */
export const ItemPageStore = signalStore(
  withState<ItemPageState>({ page: null, status: 'loading' }),
  withMethods((store, api = inject(DiscoverApiClient), location = inject(DeviceLocation)) => {
    let request = 0;
    return {
      async load(id: string): Promise<void> {
        const current = ++request;
        patchState(store, { status: 'loading' });
        try {
          const page = await api.item(id, await location.locate());
          if (current === request) {
            patchState(store, { page, status: 'loaded' });
          }
        } catch (error) {
          if (current === request) {
            patchState(store, { page: null, status: failure(error) });
          }
        }
      },
    };
  }),
);

interface VenuePageState {
  page: VenuePage | null;
  status: PageStatus;
}

/** One venue's page. Provide it in the routed page. */
export const VenuePageStore = signalStore(
  withState<VenuePageState>({ page: null, status: 'loading' }),
  withMethods((store, api = inject(DiscoverApiClient), location = inject(DeviceLocation)) => {
    let request = 0;
    return {
      async load(id: string): Promise<void> {
        const current = ++request;
        patchState(store, { status: 'loading' });
        try {
          const page = await api.venue(id, await location.locate());
          if (current === request) {
            patchState(store, { page, status: 'loaded' });
          }
        } catch (error) {
          if (current === request) {
            patchState(store, { page: null, status: failure(error) });
          }
        }
      },
    };
  }),
);
