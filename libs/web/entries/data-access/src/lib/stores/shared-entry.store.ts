import { inject } from '@angular/core';
import { type SharedEntryView } from '@menu/shared/contracts';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { EntryApiClient } from '../entry/entry.api-client';
import { failure, type LoadStatus } from './load-status';

interface SharedEntryState {
  view: SharedEntryView | null;
  status: LoadStatus;
}

/** What a share link shows. Provide it in the routed page. */
export const SharedEntryStore = signalStore(
  withState<SharedEntryState>({ view: null, status: 'loading' }),
  withMethods((store, api = inject(EntryApiClient)) => {
    let request = 0;
    return {
      async load(token: string): Promise<void> {
        const current = ++request;
        patchState(store, { status: 'loading' });
        try {
          const view = await api.shared(token);
          if (current === request) {
            patchState(store, { view, status: 'loaded' });
          }
        } catch (error) {
          if (current === request) {
            patchState(store, { view: null, status: failure(error) });
          }
        }
      },
    };
  }),
);
