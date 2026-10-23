import { computed, effect, inject, untracked } from '@angular/core';
import { type DiscoverItem, type GeoPoint, type MapPin, type Tag } from '@menu/shared/contracts';
import { Auth } from '@menu/web/shared/util-auth';
import { DataChanges } from '@menu/web/shared/util-events';
import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { DiscoverApiClient } from '../api/discover.api-client';
import { DeviceLocation } from '@menu/web/shared/util-device';

export type FeedView = 'reels' | 'list' | 'map';
export type FeedSort = 'score' | 'distance' | 'price';

export interface FeedFilters {
  tagIds: string[];
  radiusKm: number;
  sort: FeedSort;
  /** In agorot; null for any price. */
  maxPrice: number | null;
}

export const DEFAULT_FILTERS: FeedFilters = {
  tagIds: [],
  radiusKm: 5,
  sort: 'score',
  maxPrice: null,
};

const PAGE_SIZE = 20;

interface FeedState {
  view: FeedView;
  filters: FeedFilters;
  items: DiscoverItem[];
  nextOffset: number | null;
  status: 'idle' | 'loading' | 'loaded' | 'error';
  tags: Tag[];
  /** Other items at a venue, for tapping through them in reels. */
  venueItems: Record<string, DiscoverItem[]>;
  /** The reels card on screen, restored when the user comes back to the feed. */
  reelIndex: number;
  /** The map view: one pin per venue with matching items. */
  pins: MapPin[];
  /** Where the user is, when they shared it; the map centres on it. */
  near: GeoPoint | null;
}

const initialState: FeedState = {
  view: 'reels',
  filters: DEFAULT_FILTERS,
  items: [],
  nextOffset: null,
  status: 'idle',
  tags: [],
  venueItems: {},
  reelIndex: 0,
  pins: [],
  near: null,
};

/**
 * The discover feed: reels or list, with the filters the user picked. App-wide
 * so the feed is where they left it after visiting an item or a venue.
 */
export const FeedStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ items, filters, tags }) => ({
    /** Items with a score; the list puts the rest after a divider. */
    ranked: computed(() => items().filter((item) => item.score !== null)),
    unranked: computed(() => items().filter((item) => item.score === null)),
    filterCount: computed(() => {
      const current = filters();
      return (
        current.tagIds.length +
        (current.radiusKm === DEFAULT_FILTERS.radiusKm ? 0 : 1) +
        (current.sort === DEFAULT_FILTERS.sort ? 0 : 1) +
        (current.maxPrice === null ? 0 : 1)
      );
    }),
    /** The first chosen tag, named on the filter button. */
    primaryTag: computed(() => tags().find((tag) => tag.id === filters().tagIds[0]) ?? null),
  })),
  withMethods((store, api = inject(DiscoverApiClient), location = inject(DeviceLocation)) => {
    let request = 0;
    /** Set by a refresh that should leave the user on the reel they were watching. */
    let keepReel = false;

    /** `keep` leaves the user on their reel; any other fetch forgets an earlier ask to. */
    async function fetchPage(offset: number, keep = false): Promise<void> {
      const current = ++request;
      keepReel = false;
      patchState(store, { status: 'loading' });
      try {
        const near = await location.locate();
        const filters = store.filters();
        const view = store.view();
        if (view === 'map') {
          const pins = await api.map({ near, radiusKm: filters.radiusKm, tagIds: filters.tagIds });
          if (current === request) {
            patchState(store, { pins, near, status: 'loaded' });
          }
          return;
        }
        const page = await api.feed({
          near,
          ...filters,
          mode: view,
          offset,
          limit: PAGE_SIZE,
        });
        if (current !== request) {
          return;
        }
        const reelIndex = keep && store.reelIndex() < page.items.length ? store.reelIndex() : 0;
        patchState(store, {
          ...(offset === 0 ? { reelIndex } : {}),
          items: offset === 0 ? page.items : [...store.items(), ...page.items],
          nextOffset: page.nextOffset,
          near,
          status: 'loaded',
        });
      } catch {
        if (current === request) {
          patchState(store, { status: 'error' });
        }
      }
    }

    return {
      /** The first page, unless it is already here. */
      async load(): Promise<void> {
        if (store.status() === 'idle' || store.status() === 'error') {
          await fetchPage(0, keepReel);
        }
      },
      async reload(): Promise<void> {
        await fetchPage(0);
      },
      async loadMore(): Promise<void> {
        const next = store.nextOffset();
        if (next !== null && store.view() !== 'map' && store.status() !== 'loading') {
          await fetchPage(next);
        }
      },
      async setFilters(changes: Partial<FeedFilters>): Promise<void> {
        patchState(store, { filters: { ...store.filters(), ...changes } });
        await fetchPage(0);
      },
      async resetFilters(): Promise<void> {
        patchState(store, { filters: DEFAULT_FILTERS });
        await fetchPage(0);
      },
      /** Reels interleave unranked items, the list puts them last, the map groups by venue. */
      async setView(view: FeedView): Promise<void> {
        if (view !== store.view()) {
          patchState(store, { view });
          await fetchPage(0);
        }
      },
      setReelIndex(reelIndex: number): void {
        patchState(store, { reelIndex });
      },
      /**
       * Marks the feed out of date (another account, a new entry): the next
       * `load()` fetches again, with fresh scores and "you wrote about this" flags.
       */
      invalidate(options: { keepReel?: boolean } = {}): void {
        request++;
        keepReel = options.keepReel ?? false;
        patchState(store, { status: 'idle', venueItems: {} });
      },
      async loadTags(): Promise<void> {
        if (store.tags().length === 0) {
          try {
            patchState(store, { tags: await api.tags() });
          } catch {
            // The filter shows no tags; the feed itself still works.
          }
        }
      },
      async loadVenueItems(venueId: string): Promise<void> {
        if (venueId in store.venueItems()) {
          return;
        }
        try {
          const page = await api.venue(venueId, location.position());
          const items = page.sections.flatMap((section) => section.items);
          patchState(store, { venueItems: { ...store.venueItems(), [venueId]: items } });
        } catch {
          // Edge taps then stay on the current item.
        }
      },
    };
  }),
  withHooks({
    onInit(store, auth = inject(Auth), changes = inject(DataChanges)) {
      let account: string | null | undefined;
      effect(() => {
        const uid = auth.status() === 'loading' ? undefined : (auth.user()?.uid ?? null);
        untracked(() => {
          if (uid === undefined) {
            return;
          }
          if (account !== undefined && account !== uid) {
            store.invalidate();
          }
          account = uid;
        });
      });
      const entries = changes.version('entries');
      let seen = entries();
      effect(() => {
        const version = entries();
        if (version !== seen) {
          seen = version;
          untracked(() => {
            store.invalidate({ keepReel: true });
          });
        }
      });
    },
  }),
);
