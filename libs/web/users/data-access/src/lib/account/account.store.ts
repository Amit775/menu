import { computed, effect, inject, untracked } from '@angular/core';
import { type Account, type Language, type UpdateAccount } from '@menu/shared/contracts';
import { Auth, NO_ROLES, Roles } from '@menu/web/shared/util-auth';
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
 * applies the account's language and roles (`Roles`, ADR 0010) to the app.
 */
export const AccountStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ account }) => ({
    isAdmin: computed(() => account()?.isAdmin ?? false),
    ownsVenues: computed(() => (account()?.ownedVenueIds.length ?? 0) > 0),
  })),
  withMethods(
    (
      store,
      api = inject(AccountApiClient),
      i18n = inject(I18n),
      auth = inject(Auth),
      roles = inject(Roles),
    ) => {
      // Each load, and each sign-out, starts a new request; only the latest may set the roles.
      let request = 0;

      function apply(account: Account): void {
        patchState(store, { account, loading: false, error: null });
        i18n.setLanguage(account.language);
        roles.set({ isAdmin: account.isAdmin, ownedVenueIds: account.ownedVenueIds });
      }
      return {
        async load(): Promise<void> {
          const current = ++request;
          patchState(store, { loading: true, error: null });
          // Guards wait for this account's roles, not the previous one's.
          roles.set(null);
          // Signed out, or a newer load started, while this was loading: drop the answer.
          const stale = (): boolean => current !== request || !auth.signedIn();
          try {
            const account = await api.me();
            if (!stale()) {
              apply(account);
            }
          } catch {
            if (!stale()) {
              patchState(store, { loading: false, error: 'load-failed' });
              // Without the account, act as a plain user rather than keep guards waiting.
              roles.set(NO_ROLES);
            }
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
          request++;
          patchState(store, initialState);
          roles.set(null);
        },
      };
    },
  ),
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
