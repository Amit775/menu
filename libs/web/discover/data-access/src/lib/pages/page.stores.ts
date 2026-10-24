import { computed, inject, resource, signal } from '@angular/core';
import { DeviceLocation } from '@menu/web/shared/util-device';
import { loadStatus } from '@menu/web/shared/util-data';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { DiscoverApiClient } from '../api/discover.api-client';

export const ItemPageStore = signalStore(
  withProps((_, api = inject(DiscoverApiClient), location = inject(DeviceLocation)) => {
    const id = signal<() => string | undefined>(() => undefined);
    return {
      _id: id,
      _page: resource({
        params: () => id()(),
        loader: async ({ params }) => api.item(params, await location.locate()),
      }),
    };
  }),
  withComputed(({ _page }) => ({
    page: computed(() => (_page.hasValue() ? _page.value() : null)),
    status: loadStatus(_page),
  })),
  withMethods(({ _id, _page }) => ({
    load(id: () => string): void {
      _id.set(id);
    },
    reload(): void {
      _page.reload();
    },
  })),
);

export const VenuePageStore = signalStore(
  withProps((_, api = inject(DiscoverApiClient), location = inject(DeviceLocation)) => {
    const id = signal<() => string | undefined>(() => undefined);
    return {
      _id: id,
      _page: resource({
        params: () => id()(),
        loader: async ({ params }) => api.venue(params, await location.locate()),
      }),
    };
  }),
  withComputed(({ _page }) => ({
    page: computed(() => (_page.hasValue() ? _page.value() : null)),
    status: loadStatus(_page),
  })),
  withMethods(({ _id, _page }) => ({
    load(id: () => string): void {
      _id.set(id);
    },
    reload(): void {
      _page.reload();
    },
  })),
);
