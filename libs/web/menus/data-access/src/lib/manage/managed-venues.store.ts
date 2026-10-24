import { computed, inject, resource } from '@angular/core';
import { type Venue } from '@menu/shared/contracts';
import { Roles } from '@menu/web/shared/util-auth';
import { loadStatus } from '@menu/web/shared/util-data';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { MenuApiClient, type NewVenue } from '../menu/menu.api-client';

export interface ManagedVenue {
  venue: Venue;
  pending: number;
}

export const ManagedVenuesStore = signalStore(
  withProps((_, api = inject(MenuApiClient), roles = inject(Roles)) => ({
    _managed: resource({
      params: () => ({ mine: !roles.isAdmin() }),
      loader: async ({ params }) => {
        const [venues, pending] = await Promise.all([api.venues(params.mine), api.pending()]);
        return { venues, pending };
      },
    }),
  })),
  withComputed(({ _managed }) => {
    const managed = computed(() => (_managed.hasValue() ? _managed.value() : null));
    const pending = computed(() => managed()?.pending ?? []);
    return {
      status: loadStatus(_managed),
      rows: computed<ManagedVenue[]>(() => {
        const counts = new Map<string, number>();
        for (const item of pending()) {
          counts.set(item.venueId, (counts.get(item.venueId) ?? 0) + 1);
        }
        return (managed()?.venues ?? [])
          .map((venue) => ({ venue, pending: counts.get(venue.id) ?? 0 }))
          .sort((a, b) => b.pending - a.pending);
      }),
      pendingTotal: computed(() => pending().length),
    };
  }),
  withMethods((store, api = inject(MenuApiClient)) => ({
    reload(): void {
      store._managed.reload();
    },
    async create(input: NewVenue): Promise<Venue> {
      const venue = await api.createVenue(input);
      if (store._managed.hasValue()) {
        const managed = store._managed.value();
        store._managed.set({ ...managed, venues: [...managed.venues, venue] });
      }
      return venue;
    },
  })),
);
