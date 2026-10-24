import { computed, inject, resource, signal } from '@angular/core';
import { type AccountSummary, type Ownership } from '@menu/shared/contracts';
import { loadStatus } from '@menu/web/shared/util-data';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { PeopleApiClient } from './people.api-client';

interface People {
  venueId: string | null;
  accounts: AccountSummary[];
  owners: Ownership[];
}

export const PeopleStore = signalStore(
  withProps((_, api = inject(PeopleApiClient)) => {
    const venueId = signal<() => string | null | undefined>(() => undefined);
    return {
      _venueId: venueId,
      _people: resource({
        params: () => {
          const id = venueId()();
          return id === undefined ? undefined : { venueId: id };
        },
        loader: async ({ params }): Promise<People> => {
          const [accounts, owners] = await Promise.all([
            api.accounts(),
            params.venueId ? api.owners(params.venueId) : Promise.resolve([]),
          ]);
          return { venueId: params.venueId, accounts, owners };
        },
      }),
    };
  }),
  withComputed(({ _people }) => {
    const people = computed(() => (_people.hasValue() ? _people.value() : null));
    return {
      status: loadStatus(_people),
      venueId: computed(() => people()?.venueId ?? null),
      accounts: computed(() => people()?.accounts ?? []),
      owners: computed(() => people()?.owners ?? []),
    };
  }),
  withComputed(({ accounts, owners }) => ({
    sorted: computed(() =>
      [...accounts()].sort(
        (a, b) =>
          Number(a.displayName === '') - Number(b.displayName === '') ||
          a.displayName.localeCompare(b.displayName),
      ),
    ),
    candidates: computed(() => {
      const owning = new Set(owners().map((owner) => owner.accountId));
      return accounts().filter((account) => !owning.has(account.id));
    }),
  })),
  withMethods((store, api = inject(PeopleApiClient)) => {
    function patch(change: (people: People) => Partial<People>): void {
      if (store._people.hasValue()) {
        const people = store._people.value();
        store._people.set({ ...people, ...change(people) });
      }
    }

    function venueId(): string {
      const id = store.venueId();
      if (!id) {
        throw new Error('Load a venue first.');
      }
      return id;
    }

    return {
      load(venueId: () => string | null): void {
        store._venueId.set(venueId);
      },
      reload(): void {
        store._people.reload();
      },
      async setAdmin(id: string, isAdmin: boolean): Promise<void> {
        const updated = await api.setAdmin(id, isAdmin);
        patch(({ accounts }) => ({
          accounts: accounts.map((account) => (account.id === id ? updated : account)),
        }));
      },
      async grant(accountId: string): Promise<void> {
        const ownership = await api.grant(venueId(), accountId);
        patch(({ owners }) => ({ owners: [...owners, ownership] }));
      },
      async revoke(accountId: string): Promise<void> {
        await api.revoke(venueId(), accountId);
        patch(({ owners }) => ({
          owners: owners.filter((owner) => owner.accountId !== accountId),
        }));
      },
    };
  }),
);
