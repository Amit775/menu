import { computed, inject, resource, signal } from '@angular/core';
import {
  type CreateEntryInput,
  type Entry,
  type ItemEntries,
  type UpdateEntry,
} from '@menu/shared/contracts';
import { DataChanges } from '@menu/web/shared/util-events';
import { loadStatus } from '@menu/web/shared/util-data';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { EntryApiClient } from '../entry/entry.api-client';
import { LastVisibility } from '../entry/last-visibility';

export const ItemEntriesStore = signalStore(
  withProps((_, api = inject(EntryApiClient)) => {
    const itemId = signal<() => string | undefined>(() => undefined);
    return {
      _itemId: itemId,
      _sheet: resource({
        params: () => itemId()(),
        loader: ({ params }) => api.forItem(params),
      }),
    };
  }),
  withComputed(({ _sheet }) => {
    const sheet = computed(() => (_sheet.hasValue() ? _sheet.value() : null));
    return {
      sheet,
      status: loadStatus(_sheet),
      mine: computed(() => sheet()?.mine ?? []),
      others: computed(() => sheet()?.others ?? []),
      lastPaid: computed(
        () => sheet()?.mine.find((entry) => entry.pricePaid !== null)?.pricePaid ?? null,
      ),
    };
  }),
  withMethods(
    (
      store,
      api = inject(EntryApiClient),
      changes = inject(DataChanges),
      lastVisibility = inject(LastVisibility),
    ) => {
      function patchSheet(change: (sheet: ItemEntries) => ItemEntries): void {
        const sheet = store.sheet();
        if (sheet) {
          store._sheet.set(change(sheet));
        }
      }

      function replaceMine(mine: Entry[]): void {
        patchSheet((sheet) => ({ ...sheet, mine }));
      }

      return {
        load(itemId: () => string): void {
          store._itemId.set(itemId);
        },
        reload(): void {
          store._sheet.reload();
        },
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
        /** Rejects when the upload fails or the API refuses the image; the entry stays as it was. */
        async setPhoto(id: string, photo: Blob): Promise<Entry> {
          const updated = await api.setPhoto(id, photo);
          replaceMine(store.mine().map((entry) => (entry.id === id ? updated : entry)));
          changes.notify('entries');
          return updated;
        },
        async removePhoto(id: string): Promise<Entry> {
          const updated = await api.removePhoto(id);
          replaceMine(store.mine().map((entry) => (entry.id === id ? updated : entry)));
          changes.notify('entries');
          return updated;
        },
        async remove(id: string): Promise<void> {
          await api.remove(id);
          replaceMine(store.mine().filter((entry) => entry.id !== id));
          changes.notify('entries');
        },
        async hide(id: string): Promise<void> {
          await api.setHidden(id, true);
          patchSheet((sheet) => ({
            ...sheet,
            others: sheet.others.filter((entry) => entry.id !== id),
          }));
          changes.notify('entries');
        },
      };
    },
  ),
);
