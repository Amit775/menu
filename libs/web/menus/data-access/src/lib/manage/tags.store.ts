import { computed, inject } from '@angular/core';
import { type CreateTag, type Tag, type UpdateTag } from '@menu/shared/contracts';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { MenuApiClient } from '../menu/menu.api-client';
import { type ManageStatus } from './manage-status';

interface TagsState {
  tags: Tag[];
  status: ManageStatus;
}

/** J7: the Admin's tag vocabulary. Provide it in the routed page. */
export const TagsStore = signalStore(
  withState<TagsState>({ tags: [], status: 'loading' }),
  withComputed(({ tags }) => ({
    sorted: computed(() => [...tags()].sort((a, b) => a.slug.localeCompare(b.slug))),
  })),
  withMethods((store, api = inject(MenuApiClient)) => ({
    async load(): Promise<void> {
      patchState(store, { status: 'loading' });
      try {
        patchState(store, { tags: await api.tags(), status: 'loaded' });
      } catch {
        patchState(store, { status: 'error' });
      }
    },
    /** Each write rejects when the API refuses; the caller shows why. */
    async add(input: CreateTag): Promise<void> {
      const tag = await api.addTag(input);
      patchState(store, { tags: [...store.tags(), tag] });
    },
    async update(id: string, input: UpdateTag): Promise<void> {
      const updated = await api.updateTag(id, input);
      patchState(store, { tags: store.tags().map((tag) => (tag.id === id ? updated : tag)) });
    },
    /** Moves every item from `id` to `intoTagId`; `id` is gone afterwards. */
    async merge(id: string, intoTagId: string): Promise<void> {
      await api.mergeTag(id, intoTagId);
      patchState(store, { tags: store.tags().filter((tag) => tag.id !== id) });
    },
  })),
);
