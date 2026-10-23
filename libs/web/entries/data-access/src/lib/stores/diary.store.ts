import { inject } from '@angular/core';
import { type EntryWithItem } from '@menu/shared/contracts';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { EntryApiClient } from '../entry/entry.api-client';
import { failure, type LoadStatus } from './load-status';

interface DiaryState {
  entries: EntryWithItem[];
  status: LoadStatus;
}

/** The caller's diary, newest first. Provide it in the routed page. */
export const DiaryStore = signalStore(
  withState<DiaryState>({ entries: [], status: 'loading' }),
  withMethods((store, api = inject(EntryApiClient)) => ({
    async load(): Promise<void> {
      patchState(store, { status: 'loading' });
      try {
        patchState(store, { entries: await api.diary(), status: 'loaded' });
      } catch (error) {
        patchState(store, { status: failure(error) });
      }
    },
  })),
);
