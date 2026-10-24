import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
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

export type NewItem = Partial<CreateItem> & Pick<CreateItem, 'sectionId' | 'name'>;

export type NewVenue = Partial<CreateVenue> & Pick<CreateVenue, 'name' | 'address' | 'location'>;

@Service()
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

  reorderSections(venueId: string, sectionIds: string[]): Promise<MenuSection[]> {
    return this.send(
      'put',
      `${menuSectionPath(venueId)}/order`,
      { sectionIds },
      z.array(MenuSectionSchema),
    );
  }

  items(venueId: string): Promise<Item[]> {
    return this.get(venueItemsPath(venueId), z.array(ItemSchema));
  }

  addItem(venueId: string, input: NewItem): Promise<Item> {
    return this.send('post', venueItemsPath(venueId), input, ItemSchema);
  }

  updateItem(id: string, input: UpdateItem): Promise<Item> {
    return this.send('patch', `${itemPath}/${id}`, input, ItemSchema);
  }

  decide(id: string, decision: ItemDecision): Promise<Item> {
    return this.send('post', `${itemPath}/${id}/${decision}`, {}, ItemSchema);
  }

  merge(id: string, intoItemId: string): Promise<Item> {
    return this.send('post', `${itemPath}/${id}/merge`, { intoItemId }, ItemSchema);
  }

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

  async mergeTag(id: string, intoTagId: string): Promise<void> {
    await firstValueFrom(this.http.post(`/api/${tagPath}/${id}/merge`, { intoTagId }));
  }

  insights(venueId: string): Promise<VenueInsights> {
    return this.get(`${discoverPath}/venues/${venueId}/insights`, VenueInsightsSchema);
  }
}
