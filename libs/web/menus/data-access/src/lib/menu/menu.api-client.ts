import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  type CreateItem,
  type Item,
  ItemSchema,
  type MenuSection,
  menuSectionPath,
  MenuSectionSchema,
  type Venue,
  venueItemsPath,
  venuePath,
  VenueSchema,
} from '@menu/shared/contracts';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

/** HTTP access to venues, their menu sections and items. Every response is validated against the shared contract. */
@Injectable({ providedIn: 'root' })
export class MenuApiClient {
  private readonly http = inject(HttpClient);

  async venue(id: string): Promise<Venue> {
    const body = await firstValueFrom(this.http.get<unknown>(`/api/${venuePath}/${id}`));
    return VenueSchema.parse(body);
  }

  async sections(venueId: string): Promise<MenuSection[]> {
    const body = await firstValueFrom(this.http.get<unknown>(`/api/${menuSectionPath(venueId)}`));
    return z.array(MenuSectionSchema).parse(body);
  }

  /** From a user, a pending item only they see until the venue approves it; from its Owner or an Admin, approved at once. */
  async addItem(
    venueId: string,
    input: Partial<CreateItem> & Pick<CreateItem, 'sectionId' | 'name'>,
  ): Promise<Item> {
    const body = await firstValueFrom(
      this.http.post<unknown>(`/api/${venueItemsPath(venueId)}`, input),
    );
    return ItemSchema.parse(body);
  }
}
