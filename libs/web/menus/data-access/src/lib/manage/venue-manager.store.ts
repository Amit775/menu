import { computed, inject } from '@angular/core';
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
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { MenuApiClient, type NewItem } from '../menu/menu.api-client';
import { failure, type ManageStatus } from './manage-status';

/** One menu section with its approved items, in menu order. */
export interface MenuSectionView {
  section: MenuSection;
  items: Item[];
}

interface VenueManagerState {
  venue: Venue | null;
  sections: MenuSection[];
  items: Item[];
  tags: Tag[];
  insights: VenueInsights | null;
  status: ManageStatus;
}

const byPosition = (a: { position: number }, b: { position: number }): number =>
  a.position - b.position;

/**
 * J6: one venue as its Owner or an Admin manages it: the pending queue, the
 * menu editor and insights. Provide it in the routed page.
 */
export const VenueManagerStore = signalStore(
  withState<VenueManagerState>({
    venue: null,
    sections: [],
    items: [],
    tags: [],
    insights: null,
    status: 'loading',
  }),
  withComputed(({ sections, items, tags }) => ({
    pending: computed(() => items().filter((item) => item.state === 'pending')),
    /** Approved items: the menu as everyone sees it, and the targets of a merge. */
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
    let request = 0;

    function replace(item: Item): void {
      patchState(store, {
        items: store.items().some((current) => current.id === item.id)
          ? store.items().map((current) => (current.id === item.id ? item : current))
          : [...store.items(), item],
      });
    }

    function venueId(): string {
      const venue = store.venue();
      if (!venue) {
        throw new Error('Load the venue first.');
      }
      return venue.id;
    }

    return {
      async load(id: string): Promise<void> {
        const current = ++request;
        patchState(store, { status: 'loading', insights: null });
        try {
          const [venue, sections, items, tags] = await Promise.all([
            api.venue(id),
            api.sections(id),
            api.items(id),
            api.tags(),
          ]);
          if (current === request) {
            patchState(store, { venue, sections, items, tags, status: 'loaded' });
          }
        } catch (error) {
          if (current === request) {
            patchState(store, { status: failure(error) });
          }
        }
      },
      /** Loads once per venue; a failure leaves it empty for the page to say so. */
      async loadInsights(): Promise<void> {
        const venue = store.venue();
        const current = request;
        if (venue && !store.insights()) {
          const insights = await api.insights(venue.id);
          // Another venue loaded meanwhile: these numbers are not its.
          if (current === request) {
            patchState(store, { insights });
          }
        }
      },
      /** Approve or reject a pending item, or archive one from the menu. Rejects when refused. */
      async decide(id: string, decision: ItemDecision): Promise<void> {
        replace(await api.decide(id, decision));
        // The menu changed, so the insights reload when next shown.
        patchState(store, { insights: null });
      },
      async merge(id: string, intoItemId: string): Promise<void> {
        replace(await api.merge(id, intoItemId));
        patchState(store, { insights: null });
      },
      /** A new item from the Owner or an Admin is approved at once. */
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
        patchState(store, { sections: [...store.sections(), section] });
      },
      async renameSection(id: string, name: LocalizedText): Promise<void> {
        const renamed = await api.renameSection(venueId(), id, { name });
        patchState(store, {
          sections: store.sections().map((section) => (section.id === id ? renamed : section)),
        });
      },
      /** Moves a section one place up (-1) or down (+1). */
      async moveSection(id: string, step: -1 | 1): Promise<void> {
        const ids = [...store.sections()].sort(byPosition).map((section) => section.id);
        const from = ids.indexOf(id);
        const to = from + step;
        if (from < 0 || to < 0 || to >= ids.length) {
          return;
        }
        [ids[from], ids[to]] = [ids[to] ?? id, id];
        patchState(store, { sections: await api.reorderSections(venueId(), ids) });
      },
      async updateVenue(changes: UpdateVenue): Promise<Venue> {
        const venue = await api.updateVenue(venueId(), changes);
        patchState(store, { venue });
        return venue;
      },
    };
  }),
);
