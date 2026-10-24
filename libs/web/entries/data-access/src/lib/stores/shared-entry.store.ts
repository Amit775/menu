import { computed, inject, resource, signal } from '@angular/core';
import { loadStatus } from '@menu/web/shared/util-data';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { EntryApiClient } from '../entry/entry.api-client';

export const SharedEntryStore = signalStore(
  withProps((_, api = inject(EntryApiClient)) => {
    const token = signal<() => string | undefined>(() => undefined);
    return {
      _token: token,
      _view: resource({
        params: () => token()(),
        loader: ({ params }) => api.shared(params),
      }),
    };
  }),
  withComputed(({ _view }) => ({
    view: computed(() => (_view.hasValue() ? _view.value() : null)),
    status: loadStatus(_view),
  })),
  withMethods(({ _token, _view }) => ({
    load(token: () => string): void {
      _token.set(token);
    },
    reload(): void {
      _view.reload();
    },
  })),
);
