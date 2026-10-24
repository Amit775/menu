import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  discoverPath,
  type Feed,
  type FeedQuery,
  FeedSchema,
  type GeoPoint,
  type ItemPage,
  ItemPageSchema,
  type MapPin,
  MapPinSchema,
  type SearchResults,
  SearchResultsSchema,
  type Tag,
  tagPath,
  TagSchema,
  type VenuePage,
  VenuePageSchema,
} from '@menu/shared/contracts';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

/** What the feed can be asked for (`FeedQuerySchema`); the API fills in the defaults. */
export interface FeedRequest {
  near: GeoPoint | null;
  radiusKm?: FeedQuery['radiusKm'];
  tagIds?: readonly string[];
  mode?: FeedQuery['mode'];
  sort?: FeedQuery['sort'];
  maxPrice?: FeedQuery['maxPrice'] | null;
  offset?: FeedQuery['offset'];
  limit?: FeedQuery['limit'];
}

type ParamValue = string | number | null | undefined;

function params(values: Record<string, ParamValue>): HttpParams {
  let result = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== '') {
      result = result.set(key, value);
    }
  }
  return result;
}

function nearParams(near: GeoPoint | null): Record<string, ParamValue> {
  return { lat: near?.lat, lng: near?.lng };
}

/** HTTP access to `/api/discover` (and the tag vocabulary). Every response is validated against the shared contract. */
@Service()
export class DiscoverApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `/api/${discoverPath}`;

  async feed(request: FeedRequest): Promise<Feed> {
    const { near, tagIds, ...rest } = request;
    const query = params({
      ...nearParams(near),
      ...rest,
      tagIds: tagIds?.join(','),
    });
    return FeedSchema.parse(await this.get(`${this.baseUrl}/feed`, query));
  }

  /** One pin per venue with matching items, for the map. */
  async map(request: Pick<FeedRequest, 'near' | 'radiusKm' | 'tagIds'>): Promise<MapPin[]> {
    const query = params({
      ...nearParams(request.near),
      radiusKm: request.radiusKm,
      tagIds: request.tagIds?.join(','),
    });
    return z.array(MapPinSchema).parse(await this.get(`${this.baseUrl}/map`, query));
  }

  async venue(id: string, near: GeoPoint | null): Promise<VenuePage> {
    const url = `${this.baseUrl}/venues/${encodeURIComponent(id)}`;
    return VenuePageSchema.parse(await this.get(url, params(nearParams(near))));
  }

  async item(id: string, near: GeoPoint | null): Promise<ItemPage> {
    const url = `${this.baseUrl}/items/${encodeURIComponent(id)}`;
    return ItemPageSchema.parse(await this.get(url, params(nearParams(near))));
  }

  async search(text: string): Promise<SearchResults> {
    return SearchResultsSchema.parse(await this.get(`${this.baseUrl}/search`, params({ q: text })));
  }

  /** The tag vocabulary, for the filter. */
  async tags(): Promise<Tag[]> {
    return z.array(TagSchema).parse(await this.get(`/api/${tagPath}`));
  }

  private get(url: string, query?: HttpParams): Promise<unknown> {
    return firstValueFrom(this.http.get<unknown>(url, query ? { params: query } : {}));
  }
}
