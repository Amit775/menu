import { computed, inject, resource, signal } from '@angular/core';
import { type DiaryQuery } from '@menu/shared/contracts';
import { loadStatus } from '@menu/web/shared/util-data';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { EntryApiClient } from '../entry/entry.api-client';

export const DiaryStore = signalStore(
  withProps((_, api = inject(EntryApiClient)) => {
    const query = signal<() => DiaryQuery | undefined>(() => undefined);
    return {
      _query: query,
      _diary: resource({
        params: () => query()(),
        loader: ({ params }) => api.diary(params),
      }),
    };
  }),
  withComputed(({ _diary }) => ({
    entries: computed(() => (_diary.hasValue() ? _diary.value() : [])),
    status: loadStatus(_diary),
  })),
  withMethods(({ _query, _diary }) => ({
    load(query: () => DiaryQuery): void {
      _query.set(query);
    },
    reload(): void {
      _diary.reload();
    },
  })),
);
