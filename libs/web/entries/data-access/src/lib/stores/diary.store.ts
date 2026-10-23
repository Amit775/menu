import { inject } from '@angular/core';
import { type DiaryQuery, type EntryWithItem } from '@menu/shared/contracts';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { EntryApiClient } from '../entry/entry.api-client';
import { failure, type LoadStatus } from './load-status';

interface DiaryState {
  entries: EntryWithItem[];
  status: LoadStatus;
}

/** The caller's diary, newest first, optionally for one venue. Provide it in the routed page. */
export const DiaryStore = signalStore(
  withState<DiaryState>({ entries: [], status: 'loading' }),
  withMethods((store, api = inject(EntryApiClient)) => {
    let request = 0;
    return {
      async load(query: DiaryQuery = {}): Promise<void> {
        const current = ++request;
        patchState(store, { status: 'loading' });
        try {
          const entries = await api.diary(query);
          if (current === request) {
            patchState(store, { entries, status: 'loaded' });
          }
        } catch (error) {
          if (current === request) {
            patchState(store, { status: failure(error) });
          }
        }
      },
    };
  }),
);
