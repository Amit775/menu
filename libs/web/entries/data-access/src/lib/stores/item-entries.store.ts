import { computed, inject } from '@angular/core';
import {
  type CreateEntryInput,
  type Entry,
  type ItemEntries,
  type UpdateEntry,
} from '@menu/shared/contracts';
import { DataChanges } from '@menu/web/shared/util-events';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { EntryApiClient } from '../entry/entry.api-client';
import { LastVisibility } from '../entry/last-visibility';
import { failure, type LoadStatus } from './load-status';

interface ItemEntriesState {
  sheet: ItemEntries | null;
  status: LoadStatus;
}

/**
 * One item with the caller's entries and other people's public ones: the
 * entries sheet and the log form. Every write tells discover (ADR 0009).
 * Provide it in the routed page.
 */
export const ItemEntriesStore = signalStore(
  withState<ItemEntriesState>({ sheet: null, status: 'loading' }),
  withComputed(({ sheet }) => ({
    mine: computed(() => sheet()?.mine ?? []),
    others: computed(() => sheet()?.others ?? []),
    /** What the user paid the last time they wrote it down. */
    lastPaid: computed(
      () => sheet()?.mine.find((entry) => entry.pricePaid !== null)?.pricePaid ?? null,
    ),
  })),
  withMethods(
    (
      store,
      api = inject(EntryApiClient),
      changes = inject(DataChanges),
      lastVisibility = inject(LastVisibility),
    ) => {
      let request = 0;

      function replaceMine(mine: Entry[]): void {
        const sheet = store.sheet();
        if (sheet) {
          patchState(store, { sheet: { ...sheet, mine } });
        }
      }

      return {
        async load(itemId: string): Promise<void> {
          const current = ++request;
          patchState(store, { status: 'loading' });
          try {
            const sheet = await api.forItem(itemId);
            if (current === request) {
              patchState(store, { sheet, status: 'loaded' });
            }
          } catch (error) {
            if (current === request) {
              patchState(store, { sheet: null, status: failure(error) });
            }
          }
        },
        /** Rejects when the API refuses; the caller shows why. */
        async create(itemId: string, input: CreateEntryInput): Promise<Entry> {
          const created = await api.create(itemId, input);
          if (input.visibility) {
            lastVisibility.set(input.visibility);
          }
          replaceMine([created, ...store.mine()]);
          changes.notify('entries');
          return created;
        },
        async update(id: string, input: UpdateEntry): Promise<Entry> {
          // Editing an old entry leaves the default for new ones alone.
          const updated = await api.update(id, input);
          replaceMine(store.mine().map((entry) => (entry.id === id ? updated : entry)));
          changes.notify('entries');
          return updated;
        },
        async remove(id: string): Promise<void> {
          await api.remove(id);
          replaceMine(store.mine().filter((entry) => entry.id !== id));
          changes.notify('entries');
        },
        /** Admin: takes someone else's entry off public view (it leaves the sheet). */
        async hide(id: string): Promise<void> {
          await api.setHidden(id, true);
          const sheet = store.sheet();
          if (sheet) {
            patchState(store, {
              sheet: { ...sheet, others: sheet.others.filter((entry) => entry.id !== id) },
            });
          }
          changes.notify('entries');
        },
      };
    },
  ),
);
