import { computed, effect, inject, untracked } from '@angular/core';
import { type Account, type Language, type UpdateAccount } from '@menu/shared/contracts';
import { Auth } from '@menu/web/shared/util-auth';
import { I18n } from '@menu/web/shared/util-i18n';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { AccountApiClient } from './account.api-client';

export type AccountError = 'load-failed' | 'save-failed';

interface AccountState {
  account: Account | null;
  loading: boolean;
  error: AccountError | null;
}

const initialState: AccountState = { account: null, loading: false, error: null };

/**
 * The signed-in account, app-wide. Loads after sign-in, clears on sign-out, and
 * applies the account's language to the app.
 */
export const AccountStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ account }) => ({
    isAdmin: computed(() => account()?.isAdmin ?? false),
    ownsVenues: computed(() => (account()?.ownedVenueIds.length ?? 0) > 0),
  })),
  withMethods((store, api = inject(AccountApiClient), i18n = inject(I18n), auth = inject(Auth)) => {
    function apply(account: Account): void {
      patchState(store, { account, loading: false, error: null });
      i18n.setLanguage(account.language);
    }
    return {
      async load(): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const account = await api.me();
          // Signed out (or someone else signed in) while this was loading: drop it.
          if (auth.signedIn()) {
            apply(account);
          }
        } catch {
          patchState(store, { loading: false, error: 'load-failed' });
        }
      },
      async update(changes: UpdateAccount): Promise<boolean> {
        try {
          apply(await api.updateMe(changes));
          return true;
        } catch {
          patchState(store, { error: 'save-failed' });
          return false;
        }
      },
      /** Switches the app at once; saved to the account when signed in. */
      async setLanguage(language: Language): Promise<void> {
        i18n.setLanguage(language);
        if (store.account()) {
          await this.update({ language });
        }
      },
      clear(): void {
        patchState(store, initialState);
      },
    };
  }),
  withHooks({
    onInit(store, auth = inject(Auth)) {
      effect(() => {
        const signedIn = auth.signedIn();
        untracked(() => {
          if (signedIn) {
            void store.load();
          } else {
            store.clear();
          }
        });
      });
    },
  }),
);
