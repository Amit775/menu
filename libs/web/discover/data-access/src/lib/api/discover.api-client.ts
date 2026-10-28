import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  type DiscoverItem,
  DiscoverItemSchema,
  discoverPath,
  discoverSavedPath,
  type Feed,
  type FeedQuery,
  FeedSchema,
  type GeoPoint,
  type ItemPage,
  ItemPageSchema,
  type MapPin,
  MapPinSchema,
  type SavedItem,
  type CreateItemReportInput,
  itemReportsPath,
  savedItemPath,
  SavedItemSchema,
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

  async saved(near: GeoPoint | null): Promise<DiscoverItem[]> {
    const url = `${this.baseUrl}/${discoverSavedPath}`;
    return z.array(DiscoverItemSchema).parse(await this.get(url, params(nearParams(near))));
  }

  async save(itemId: string): Promise<SavedItem> {
    const url = `/api/${savedItemPath}/${encodeURIComponent(itemId)}`;
    return SavedItemSchema.parse(await firstValueFrom(this.http.put<unknown>(url, {})));
  }

  async report(itemId: string, input: CreateItemReportInput): Promise<void> {
    await firstValueFrom(
      this.http.post(`/api/${itemReportsPath(encodeURIComponent(itemId))}`, input),
    );
  }

  async unsave(itemId: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/${savedItemPath}/${encodeURIComponent(itemId)}`));
  }

  async search(text: string): Promise<SearchResults> {
    return SearchResultsSchema.parse(await this.get(`${this.baseUrl}/search`, params({ q: text })));
  }

  async tags(): Promise<Tag[]> {
    return z.array(TagSchema).parse(await this.get(`/api/${tagPath}`));
  }

  private get(url: string, query?: HttpParams): Promise<unknown> {
    return firstValueFrom(this.http.get<unknown>(url, query ? { params: query } : {}));
  }
}
