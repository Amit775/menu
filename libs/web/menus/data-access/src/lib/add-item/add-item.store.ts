import { computed, inject, resource, signal } from '@angular/core';
import { type CreateItem, type Item } from '@menu/shared/contracts';
import { loadStatus } from '@menu/web/shared/util-data';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { MenuApiClient } from '../menu/menu.api-client';

export const AddItemStore = signalStore(
  withProps((_, api = inject(MenuApiClient)) => {
    const venueId = signal<() => string | undefined>(() => undefined);
    return {
      _venueId: venueId,
      _venue: resource({
        params: () => venueId()(),
        loader: async ({ params }) => {
          const [venue, sections] = await Promise.all([api.venue(params), api.sections(params)]);
          return { venue, sections };
        },
      }),
    };
  }),
  withComputed(({ _venue }) => {
    const loaded = computed(() => (_venue.hasValue() ? _venue.value() : null));
    return {
      status: loadStatus(_venue),
      venue: computed(() => loaded()?.venue ?? null),
      sections: computed(() => loaded()?.sections ?? []),
    };
  }),
  withMethods((store, api = inject(MenuApiClient)) => ({
    load(venueId: () => string): void {
      store._venueId.set(venueId);
    },
    reload(): void {
      store._venue.reload();
    },
    add(input: Pick<CreateItem, 'sectionId' | 'name' | 'listPrice'>): Promise<Item> {
      const venue = store.venue();
      if (!venue) {
        return Promise.reject(new Error('Load the venue first.'));
      }
      return api.addItem(venue.id, input);
    },
  })),
);
