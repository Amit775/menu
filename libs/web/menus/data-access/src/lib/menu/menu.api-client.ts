import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  type CreateItem,
  type CreateMenuSection,
  type CreateTag,
  type CreateVenue,
  discoverPath,
  type Item,
  type ItemDecision,
  itemPath,
  ItemSchema,
  type MenuSection,
  menuSectionPath,
  MenuSectionSchema,
  type Tag,
  tagPath,
  TagSchema,
  type UpdateItem,
  type UpdateMenuSection,
  type UpdateTag,
  type UpdateVenue,
  type Venue,
  type VenueInsights,
  VenueInsightsSchema,
  venueItemsPath,
  venuePath,
  VenueSchema,
} from '@menu/shared/contracts';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

/** A new item: the name and section are required; the API fills in the rest (`CreateItemSchema`). */
export type NewItem = Partial<CreateItem> & Pick<CreateItem, 'sectionId' | 'name'>;

/** A new venue: the API fills in phone, reservation link and sections (`CreateVenueSchema`). */
export type NewVenue = Partial<CreateVenue> & Pick<CreateVenue, 'name' | 'address' | 'location'>;

/**
 * HTTP access to venues, their menu sections and items, the pending queue, the
 * tag vocabulary and a venue's insights. Every response is validated against
 * the shared contract.
 */
@Injectable({ providedIn: 'root' })
export class MenuApiClient {
  private readonly http = inject(HttpClient);

  private async get<T>(url: string, schema: z.ZodType<T>, params?: HttpParams): Promise<T> {
    const body = await firstValueFrom(
      this.http.get<unknown>(`/api/${url}`, params ? { params } : {}),
    );
    return schema.parse(body);
  }

  private async send<T>(
    method: 'post' | 'patch' | 'put',
    url: string,
    input: unknown,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const body = await firstValueFrom(
      this.http.request<unknown>(method, `/api/${url}`, { body: input }),
    );
    return schema.parse(body);
  }

  /** Every venue for an Admin, or with `owned` only the caller's. */
  venues(owned = false): Promise<Venue[]> {
    const params = owned ? new HttpParams().set('owned', 'true') : undefined;
    return this.get(venuePath, z.array(VenueSchema), params);
  }

  venue(id: string): Promise<Venue> {
    return this.get(`${venuePath}/${id}`, VenueSchema);
  }

  createVenue(input: NewVenue): Promise<Venue> {
    return this.send('post', venuePath, input, VenueSchema);
  }

  updateVenue(id: string, input: UpdateVenue): Promise<Venue> {
    return this.send('patch', `${venuePath}/${id}`, input, VenueSchema);
  }

  sections(venueId: string): Promise<MenuSection[]> {
    return this.get(menuSectionPath(venueId), z.array(MenuSectionSchema));
  }

  addSection(venueId: string, input: CreateMenuSection): Promise<MenuSection> {
    return this.send('post', menuSectionPath(venueId), input, MenuSectionSchema);
  }

  renameSection(venueId: string, id: string, input: UpdateMenuSection): Promise<MenuSection> {
    return this.send('patch', `${menuSectionPath(venueId)}/${id}`, input, MenuSectionSchema);
  }

  /** Every section id of the venue, in the new order. */
  reorderSections(venueId: string, sectionIds: string[]): Promise<MenuSection[]> {
    return this.send(
      'put',
      `${menuSectionPath(venueId)}/order`,
      { sectionIds },
      z.array(MenuSectionSchema),
    );
  }

  /** The menu: approved items, and pending ones for the venue's Owner or an Admin. */
  items(venueId: string): Promise<Item[]> {
    return this.get(venueItemsPath(venueId), z.array(ItemSchema));
  }

  /** From a user, a pending item only they see until the venue approves it; from its Owner or an Admin, approved at once. */
  addItem(venueId: string, input: NewItem): Promise<Item> {
    return this.send('post', venueItemsPath(venueId), input, ItemSchema);
  }

  updateItem(id: string, input: UpdateItem): Promise<Item> {
    return this.send('patch', `${itemPath}/${id}`, input, ItemSchema);
  }

  /** Approve or reject a pending item, or archive an item. */
  decide(id: string, decision: ItemDecision): Promise<Item> {
    return this.send('post', `${itemPath}/${id}/${decision}`, {}, ItemSchema);
  }

  /** The pending item is a duplicate of `intoItemId`; its entries move there. */
  merge(id: string, intoItemId: string): Promise<Item> {
    return this.send('post', `${itemPath}/${id}/merge`, { intoItemId }, ItemSchema);
  }

  /** Pending submissions the caller can decide on. */
  pending(): Promise<Item[]> {
    return this.get(`${itemPath}/pending`, z.array(ItemSchema));
  }

  tags(): Promise<Tag[]> {
    return this.get(tagPath, z.array(TagSchema));
  }

  addTag(input: CreateTag): Promise<Tag> {
    return this.send('post', tagPath, input, TagSchema);
  }

  updateTag(id: string, input: UpdateTag): Promise<Tag> {
    return this.send('patch', `${tagPath}/${id}`, input, TagSchema);
  }

  /** Re-points every item from this tag to `intoTagId`, then deletes it. */
  async mergeTag(id: string, intoTagId: string): Promise<void> {
    await firstValueFrom(this.http.post(`/api/${tagPath}/${id}/merge`, { intoTagId }));
  }

  /** Per item: score, public entries, other entries as a count from the floor up. */
  insights(venueId: string): Promise<VenueInsights> {
    return this.get(`${discoverPath}/venues/${venueId}/insights`, VenueInsightsSchema);
  }
}
