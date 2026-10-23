import { inject } from '@angular/core';
import { type SearchResults } from '@menu/shared/contracts';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { DiscoverApiClient } from '../api/discover.api-client';

interface SearchState {
  text: string;
  results: SearchResults | null;
  status: 'idle' | 'loading' | 'loaded' | 'error';
}

/** Search across items, venues and tags. Provide it in the screen that searches. */
export const SearchStore = signalStore(
  withState<SearchState>({ text: '', results: null, status: 'idle' }),
  withMethods((store, api = inject(DiscoverApiClient)) => {
    let request = 0;
    return {
      /** Searches for the text; results of an older search never overwrite a newer one. */
      async search(text: string): Promise<void> {
        const current = ++request;
        const trimmed = text.trim();
        if (trimmed === '') {
          patchState(store, { text: '', results: null, status: 'idle' });
          return;
        }
        patchState(store, { text: trimmed, status: 'loading' });
        try {
          const results = await api.search(trimmed.slice(0, 60));
          if (current === request) {
            patchState(store, { results, status: 'loaded' });
          }
        } catch {
          if (current === request) {
            patchState(store, { results: null, status: 'error' });
          }
        }
      },
      clear(): void {
        request++;
        patchState(store, { text: '', results: null, status: 'idle' });
      },
    };
  }),
);
