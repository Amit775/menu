import { computed, inject, linkedSignal, resource, signal } from '@angular/core';
import {
  type Item,
  type ItemDecision,
  type LocalizedText,
  type MenuSection,
  type Tag,
  type UpdateItem,
  type UpdateVenue,
  type Venue,
  type VenueInsights,
} from '@menu/shared/contracts';
import { loadStatus } from '@menu/web/shared/util-data';
import { signalStore, withComputed, withMethods, withProps } from '@ngrx/signals';
import { MenuApiClient, type NewItem, type NewVenue } from '../menu/menu.api-client';

export interface MenuSectionView {
  section: MenuSection;
  items: Item[];
}

interface ManagedVenue {
  venue: Venue;
  sections: MenuSection[];
  items: Item[];
  tags: Tag[];
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position;

export const VenueManagerStore = signalStore(
  withProps((_, api = inject(MenuApiClient)) => {
    const id = signal<() => string | undefined>(() => undefined);
    return {
      _id: id,
      _managed: resource({
        params: () => id()(),
        loader: async ({ params }): Promise<ManagedVenue> => {
          const [venue, sections, items, tags] = await Promise.all([
            api.venue(params),
            api.sections(params),
            api.items(params),
            api.tags(),
          ]);
          return { venue, sections, items, tags };
        },
      }),
    };
  }),
  withComputed(({ _managed }) => {
    const managed = computed(() => (_managed.hasValue() ? _managed.value() : null));
    return {
      status: loadStatus(_managed),
      venue: computed(() => managed()?.venue ?? null),
      sections: computed(() => managed()?.sections ?? []),
      items: computed(() => managed()?.items ?? []),
      tags: computed(() => managed()?.tags ?? []),
    };
  }),
  withProps(({ venue }) => ({
    _insights: linkedSignal<string | undefined, VenueInsights | null>({
      source: () => venue()?.id,
      computation: () => null,
    }),
  })),
  withComputed(({ sections, items, tags, _insights }) => ({
    insights: computed(() => _insights()),
    pending: computed(() => items().filter((item) => item.state === 'pending')),
    approved: computed(() => items().filter((item) => item.state === 'approved')),
    menu: computed<MenuSectionView[]>(() =>
      [...sections()].sort(byPosition).map((section) => ({
        section,
        items: items()
          .filter((item) => item.sectionId === section.id && item.state === 'approved')
          .sort(byPosition),
      })),
    ),
    tagsById: computed(() => new Map(tags().map((tag) => [tag.id, tag]))),
    sectionsById: computed(() => new Map(sections().map((section) => [section.id, section]))),
  })),
  withMethods((store, api = inject(MenuApiClient)) => {
    function patch(change: (managed: ManagedVenue) => Partial<ManagedVenue>): void {
      if (store._managed.hasValue()) {
        const managed = store._managed.value();
        store._managed.set({ ...managed, ...change(managed) });
      }
    }

    function replace(item: Item): void {
      patch(({ items }) => ({
        items: items.some((current) => current.id === item.id)
          ? items.map((current) => (current.id === item.id ? item : current))
          : [...items, item],
      }));
    }

    function venueId(): string {
      const venue = store.venue();
      if (!venue) {
        throw new Error('Load the venue first.');
      }
      return venue.id;
    }

    return {
      load(id: () => string | undefined): void {
        store._id.set(id);
      },
      reload(): void {
        store._managed.reload();
      },
      async loadInsights(): Promise<void> {
        const venue = store.venue();
        if (venue && !store.insights()) {
          const insights = await api.insights(venue.id);
          if (store.venue()?.id === venue.id) {
            store._insights.set(insights);
          }
        }
      },
      async decide(id: string, decision: ItemDecision): Promise<void> {
        replace(await api.decide(id, decision));
        store._insights.set(null);
      },
      async merge(id: string, intoItemId: string): Promise<void> {
        replace(await api.merge(id, intoItemId));
        store._insights.set(null);
      },
      async addItem(input: NewItem): Promise<Item> {
        const item = await api.addItem(venueId(), input);
        replace(item);
        return item;
      },
      async updateItem(id: string, input: UpdateItem): Promise<Item> {
        const item = await api.updateItem(id, input);
        replace(item);
        return item;
      },
      async addSection(name: LocalizedText): Promise<void> {
        const section = await api.addSection(venueId(), { name });
        patch(({ sections }) => ({ sections: [...sections, section] }));
      },
      async renameSection(id: string, name: LocalizedText): Promise<void> {
        const renamed = await api.renameSection(venueId(), id, { name });
        patch(({ sections }) => ({
          sections: sections.map((section) => (section.id === id ? renamed : section)),
        }));
      },
      async moveSection(id: string, step: -1 | 1): Promise<void> {
        const ids = [...store.sections()].sort(byPosition).map((section) => section.id);
        const from = ids.indexOf(id);
        const to = from + step;
        if (from < 0 || to < 0 || to >= ids.length) {
          return;
        }
        [ids[from], ids[to]] = [ids[to] ?? id, id];
        const sections = await api.reorderSections(venueId(), ids);
        patch(() => ({ sections }));
      },
      createVenue(input: NewVenue): Promise<Venue> {
        return api.createVenue(input);
      },
      async updateVenue(changes: UpdateVenue): Promise<Venue> {
        const venue = await api.updateVenue(venueId(), changes);
        patch(() => ({ venue }));
        return venue;
      },
    };
  }),
);
