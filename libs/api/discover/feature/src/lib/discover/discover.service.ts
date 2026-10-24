import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { type CatalogItem, DiscoverRepository } from '@menu/api/discover/data-access';
import { canEditVenue, type Principal } from '@menu/api/shared/util-auth';
import { ENTRY_STATS, type EntryStatsSource } from '@menu/api/shared/util-ports';
import {
  type DiscoverItem,
  type Feed,
  type FeedQuery,
  type GeoPoint,
  type ItemPage,
  type MapPin,
  type MapQuery,
  type Near,
  type SearchResults,
  type VenueInsights,
  type VenuePage,
} from '@menu/shared/contracts';
import { orderFeed } from './feed-order';
import { distanceMeters } from './geo';
import {
  EMPTY_STATS,
  type ItemStats,
  NEUTRAL_MEAN,
  peerMeans,
  type RankingStrategy,
} from './ranking';
import { foldForSearch } from './search-text';

export const RANKING_STRATEGY = Symbol('RANKING_STRATEGY');

const SEARCH_LIMIT = 5;
const TOP_ITEMS = 3;

/** Everything one request ranks against: the catalog, its entry stats and the caller's flags. */
interface Snapshot {
  catalog: CatalogItem[];
  stats: ReadonlyMap<string, ItemStats>;
  means: Map<string, number>;
  writtenByMe: ReadonlySet<string>;
}

function pointOf(near: Near): GeoPoint | null {
  return near.lat !== undefined && near.lng !== undefined ? { lat: near.lat, lng: near.lng } : null;
}

function byScoreThenName(a: DiscoverItem, b: DiscoverItem): number {
  return (b.score ?? 0) - (a.score ?? 0) || a.name.he.localeCompare(b.name.he, 'he');
}

/**
 * Discovery: the feed, map, venue and item pages, search and Owner insights.
 * A read model over menus and entries (ADR 0004). Private entries feed scores
 * and counts only, never content, and nothing is shown under the 3-rating floor.
 */
@Injectable()
export class DiscoverService {
  constructor(
    private readonly repository: DiscoverRepository,
    @Inject(RANKING_STRATEGY) private readonly ranking: RankingStrategy,
    @Inject(ENTRY_STATS) private readonly entries: EntryStatsSource,
  ) {}

  async feed(principal: Principal | null, query: FeedQuery): Promise<Feed> {
    const snapshot = await this.snapshot(principal);
    const items = this.filter(snapshot, query).filter(
      (item) =>
        (query.minPrice === undefined || (item.latestPrice ?? -1) >= query.minPrice) &&
        (query.maxPrice === undefined ||
          (item.latestPrice !== null && item.latestPrice <= query.maxPrice)) &&
        (query.minEntries === undefined || item.ratingCount >= query.minEntries),
    );
    const ordered = orderFeed(items, query);
    const end = query.offset + query.limit;
    return {
      items: ordered.slice(query.offset, end),
      nextOffset: end < ordered.length ? end : null,
    };
  }

  async map(principal: Principal | null, query: MapQuery): Promise<MapPin[]> {
    const snapshot = await this.snapshot(principal);
    const pins = new Map<string, MapPin>();
    const locations = new Map(snapshot.catalog.map((item) => [item.venueId, item.venueLocation]));
    for (const item of this.filter(snapshot, query)) {
      const location = locations.get(item.venue.id);
      if (!location) {
        continue;
      }
      const pin = pins.get(item.venue.id) ?? {
        venue: item.venue,
        location,
        itemCount: 0,
        bestScore: null,
        writtenByMe: false,
      };
      pins.set(item.venue.id, {
        ...pin,
        itemCount: pin.itemCount + 1,
        bestScore: item.score === null ? pin.bestScore : Math.max(pin.bestScore ?? 0, item.score),
        writtenByMe: pin.writtenByMe || item.writtenByMe,
      });
    }
    return [...pins.values()];
  }

  async venuePage(principal: Principal | null, venueId: string, near: Near): Promise<VenuePage> {
    const venue = await this.repository.findActiveVenue(venueId);
    if (!venue) {
      throw new NotFoundException('Venue not found.');
    }
    const [snapshot, sections, myEntryCount] = await Promise.all([
      this.snapshot(principal),
      this.repository.listSections(venueId),
      principal ? this.entries.countEntriesAt(principal.accountId, venueId) : 0,
    ]);
    const point = pointOf(near);
    const items = snapshot.catalog
      .filter((item) => item.venueId === venueId && item.state === 'approved')
      .sort((a, b) => a.position - b.position)
      .map((item) => this.toItem(snapshot, item, point));
    return {
      venue,
      distanceMeters: point ? distanceMeters(point, venue.location) : null,
      topItems: items
        .filter((item) => item.score !== null)
        .sort(byScoreThenName)
        .slice(0, TOP_ITEMS),
      sections: sections.map((section) => ({
        section,
        items: items.filter((item) => item.sectionId === section.id),
      })),
      myEntryCount,
    };
  }

  async itemPage(principal: Principal | null, itemId: string, near: Near): Promise<ItemPage> {
    const [snapshot, tags] = await Promise.all([
      this.snapshot(principal),
      this.repository.listTags(),
    ]);
    const record = snapshot.catalog.find((item) => item.id === itemId);
    if (!record) {
      throw new NotFoundException('Item not found.');
    }
    const point = pointOf(near);
    return {
      item: this.toItem(snapshot, record, point),
      archived: record.state === 'archived',
      tags: record.tagIds.flatMap((id) => tags.filter((tag) => tag.id === id)),
      priceHistory: (snapshot.stats.get(itemId) ?? EMPTY_STATS).priceHistory,
      alsoGoodHere: snapshot.catalog
        .filter(
          (item) =>
            item.venueId === record.venueId && item.id !== itemId && item.state === 'approved',
        )
        .map((item) => this.toItem(snapshot, item, point))
        .filter((item) => item.score !== null)
        .sort(byScoreThenName)
        .slice(0, TOP_ITEMS),
    };
  }

  /** Items, venues and tags whose names contain the query, Hebrew-folded (see `foldForSearch`). */
  async search(principal: Principal | null, q: string): Promise<SearchResults> {
    const needle = foldForSearch(q);
    if (needle === '') {
      return { items: [], venues: [], tags: [] };
    }
    const matches = (...texts: (string | undefined)[]): boolean =>
      texts.some((text) => text !== undefined && foldForSearch(text).includes(needle));
    const [snapshot, venues, tags] = await Promise.all([
      this.snapshot(principal),
      this.repository.listActiveVenues(),
      this.repository.listTags(),
    ]);
    return {
      items: snapshot.catalog
        .filter((item) => item.state === 'approved' && matches(item.name.he, item.name.en))
        .map((item) => this.toItem(snapshot, item, null))
        .sort(byScoreThenName)
        .slice(0, SEARCH_LIMIT),
      venues: venues
        .filter((venue) => matches(venue.name.he, venue.name.en))
        .slice(0, SEARCH_LIMIT),
      tags: tags
        .filter((tag) => matches(tag.name.he, tag.name.en, tag.slug))
        .slice(0, SEARCH_LIMIT),
    };
  }

  /** Per item: score, public entries, and the other entries only as a count from the floor up. */
  async insights(principal: Principal, venueId: string): Promise<VenueInsights> {
    if (!canEditVenue(principal, venueId)) {
      throw new ForbiddenException('Only the venue’s Owner or an Admin sees its insights.');
    }
    if (!(await this.repository.findActiveVenue(venueId))) {
      throw new NotFoundException('Venue not found.');
    }
    const snapshot = await this.snapshot(null);
    return {
      items: snapshot.catalog
        .filter((item) => item.venueId === venueId && item.state === 'approved')
        .map((item) => {
          const stats = snapshot.stats.get(item.id) ?? EMPTY_STATS;
          const shown = this.toItem(snapshot, item, null);
          return {
            itemId: item.id,
            name: item.name,
            score: shown.score,
            ratingCount: stats.ratingCount,
            publicEntryCount: stats.publicEntryCount,
            otherEntryCount: stats.otherEntryCount,
            wouldOrderAgainPercent: stats.wouldOrderAgainPercent,
          };
        }),
    };
  }

  private async snapshot(principal: Principal | null): Promise<Snapshot> {
    const [catalog, stats, writtenByMe] = await Promise.all([
      this.repository.loadCatalog(),
      this.entries.statsByItem(),
      principal ? this.entries.itemIdsWrittenBy(principal.accountId) : new Set<string>(),
    ]);
    return { catalog, stats, means: peerMeans(catalog, stats), writtenByMe };
  }

  /** Approved items matching the shared feed and map filters: radius (with a location) and tags. */
  private filter(snapshot: Snapshot, query: MapQuery): DiscoverItem[] {
    const point = pointOf(query);
    return snapshot.catalog
      .filter((item) => item.state === 'approved')
      .filter((item) => query.tagIds.every((tagId) => item.tagIds.includes(tagId)))
      .map((item) => this.toItem(snapshot, item, point))
      .filter(
        (item) => item.distanceMeters === null || item.distanceMeters <= query.radiusKm * 1000,
      );
  }

  private toItem(snapshot: Snapshot, item: CatalogItem, point: GeoPoint | null): DiscoverItem {
    const stats = snapshot.stats.get(item.id) ?? EMPTY_STATS;
    const peerMean = snapshot.means.get(item.tagIds[0] ?? '') ?? NEUTRAL_MEAN;
    return {
      id: item.id,
      name: item.name,
      venue: { id: item.venueId, name: item.venueName },
      sectionId: item.sectionId,
      tagIds: item.tagIds,
      distanceMeters: point ? distanceMeters(point, item.venueLocation) : null,
      score: this.ranking.score(stats, peerMean),
      ratingCount: stats.ratingCount,
      wouldOrderAgainPercent: stats.wouldOrderAgainPercent,
      latestPrice: item.listPrice ?? stats.latestPublicPrice,
      photoUrl: stats.latestPublicPhotoUrl,
      writtenByMe: snapshot.writtenByMe.has(item.id),
    };
  }
}
