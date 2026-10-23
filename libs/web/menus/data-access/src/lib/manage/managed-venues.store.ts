import { computed, inject } from '@angular/core';
import { type Item, type Venue } from '@menu/shared/contracts';
import { Roles } from '@menu/web/shared/util-auth';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { MenuApiClient, type NewVenue } from '../menu/menu.api-client';
import { type ManageStatus } from './manage-status';

/** One venue in "my venues", with the items waiting for its approval. */
export interface ManagedVenue {
  venue: Venue;
  pending: number;
}

interface ManagedVenuesState {
  venues: Venue[];
  pending: Item[];
  status: ManageStatus;
}

/**
 * J6/J7: the venues the caller manages, an Owner's own or every venue for an
 * Admin, each with its pending count. Provide it in the routed page.
 */
export const ManagedVenuesStore = signalStore(
  withState<ManagedVenuesState>({ venues: [], pending: [], status: 'loading' }),
  withComputed(({ venues, pending }) => ({
    rows: computed<ManagedVenue[]>(() => {
      const counts = new Map<string, number>();
      for (const item of pending()) {
        counts.set(item.venueId, (counts.get(item.venueId) ?? 0) + 1);
      }
      return venues()
        .map((venue) => ({ venue, pending: counts.get(venue.id) ?? 0 }))
        .sort((a, b) => b.pending - a.pending);
    }),
    pendingTotal: computed(() => pending().length),
  })),
  withMethods((store, api = inject(MenuApiClient), roles = inject(Roles)) => ({
    async load(): Promise<void> {
      patchState(store, { status: 'loading' });
      try {
        const [venues, pending] = await Promise.all([api.venues(!roles.isAdmin()), api.pending()]);
        patchState(store, { venues, pending, status: 'loaded' });
      } catch {
        patchState(store, { status: 'error' });
      }
    },
    /** Admin only. Rejects when the API refuses; the caller shows why. */
    async create(input: NewVenue): Promise<Venue> {
      const venue = await api.createVenue(input);
      patchState(store, { venues: [...store.venues(), venue] });
      return venue;
    },
  })),
);
