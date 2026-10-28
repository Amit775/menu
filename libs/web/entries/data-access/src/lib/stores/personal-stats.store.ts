import { computed, inject, resource, signal } from '@angular/core';
import { loadStatus } from '@menu/web/shared/util-data';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { EntryApiClient } from '../entry/entry.api-client';

export const PersonalStatsStore = signalStore(
  withProps((_, api = inject(EntryApiClient)) => {
    const wanted = signal<() => boolean>(() => false);
    return {
      _wanted: wanted,
      _stats: resource({
        params: () => (wanted()() ? true : undefined),
        loader: () => api.stats(),
      }),
    };
  }),
  withComputed(({ _stats }) => ({
    stats: computed(() => (_stats.hasValue() ? _stats.value() : null)),
    status: loadStatus(_stats),
  })),
  withMethods(({ _wanted, _stats }) => ({
    load(wanted: () => boolean): void {
      _wanted.set(wanted);
    },
    reload(): void {
      _stats.reload();
    },
  })),
);
