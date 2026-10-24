import { computed, inject } from '@angular/core';
import { type AccountSummary, type Ownership } from '@menu/shared/contracts';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { PeopleApiClient } from './people.api-client';

export type PeopleStatus = 'loading' | 'loaded' | 'error';

interface PeopleState {
  accounts: AccountSummary[];
  /** The Owners of `venueId`, when the page manages one venue's owners. */
  owners: Ownership[];
  venueId: string | null;
  status: PeopleStatus;
}

/**
 * J7: the Admin's people: every account with its Admin flag, and the Owners
 * of one venue. Provide it in the routed page.
 */
export const PeopleStore = signalStore(
  withState<PeopleState>({ accounts: [], owners: [], venueId: null, status: 'loading' }),
  withComputed(({ accounts, owners }) => ({
    /** Named accounts first, by name; phone sign-ins without a name last. */
    sorted: computed(() =>
      [...accounts()].sort(
        (a, b) =>
          Number(a.displayName === '') - Number(b.displayName === '') ||
          a.displayName.localeCompare(b.displayName),
      ),
    ),
    /** Accounts that could become Owners of the venue: not already one. */
    candidates: computed(() => {
      const owning = new Set(owners().map((owner) => owner.accountId));
      return accounts().filter((account) => !owning.has(account.id));
    }),
  })),
  withMethods((store, api = inject(PeopleApiClient)) => {
    let request = 0;
    return {
      /** Every account, and with a venue id that venue's Owners too. */
      async load(venueId: string | null = null): Promise<void> {
        const current = ++request;
        patchState(store, { status: 'loading', venueId, owners: [] });
        try {
          const [accounts, owners] = await Promise.all([
            api.accounts(),
            venueId ? api.owners(venueId) : Promise.resolve([]),
          ]);
          if (current === request) {
            patchState(store, { accounts, owners, status: 'loaded' });
          }
        } catch {
          if (current === request) {
            patchState(store, { status: 'error' });
          }
        }
      },
      /** Each write rejects when the API refuses; the caller shows why. */
      async setAdmin(id: string, isAdmin: boolean): Promise<void> {
        const updated = await api.setAdmin(id, isAdmin);
        patchState(store, {
          accounts: store.accounts().map((account) => (account.id === id ? updated : account)),
        });
      },
      async grant(accountId: string): Promise<void> {
        const venueId = store.venueId();
        if (!venueId) {
          throw new Error('Load a venue first.');
        }
        const ownership = await api.grant(venueId, accountId);
        patchState(store, { owners: [...store.owners(), ownership] });
      },
      async revoke(accountId: string): Promise<void> {
        const venueId = store.venueId();
        if (!venueId) {
          throw new Error('Load a venue first.');
        }
        await api.revoke(venueId, accountId);
        patchState(store, {
          owners: store.owners().filter((owner) => owner.accountId !== accountId),
        });
      },
    };
  }),
);
