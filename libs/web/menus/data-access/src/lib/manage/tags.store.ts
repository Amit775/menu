import { computed, inject, resource } from '@angular/core';
import { type CreateTag, type Tag, type UpdateTag } from '@menu/shared/contracts';
import { loadStatus } from '@menu/web/shared/util-data';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { MenuApiClient } from '../menu/menu.api-client';

export const TagsStore = signalStore(
  withProps((_, api = inject(MenuApiClient)) => ({
    _tags: resource({ loader: () => api.tags() }),
  })),
  withComputed(({ _tags }) => {
    const tags = computed(() => (_tags.hasValue() ? _tags.value() : []));
    return {
      tags,
      status: loadStatus(_tags),
      sorted: computed(() => [...tags()].sort((a, b) => a.slug.localeCompare(b.slug))),
    };
  }),
  withMethods((store, api = inject(MenuApiClient)) => {
    function patch(change: (tags: Tag[]) => Tag[]): void {
      store._tags.set(change(store.tags()));
    }

    return {
      reload(): void {
        store._tags.reload();
      },
      async add(input: CreateTag): Promise<void> {
        const tag = await api.addTag(input);
        patch((tags) => [...tags, tag]);
      },
      async update(id: string, input: UpdateTag): Promise<void> {
        const updated = await api.updateTag(id, input);
        patch((tags) => tags.map((tag) => (tag.id === id ? updated : tag)));
      },
      async merge(id: string, intoTagId: string): Promise<void> {
        await api.mergeTag(id, intoTagId);
        patch((tags) => tags.filter((tag) => tag.id !== id));
      },
    };
  }),
);
