import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  type CreateEntryInput,
  type DiaryQuery,
  type Entry,
  entryPath,
  EntrySchema,
  type EntryWithItem,
  EntryWithItemSchema,
  type ItemEntries,
  itemEntriesPath,
  ItemEntriesSchema,
  sharedEntryPath,
  type SetEntryHidden,
  type SharedEntryView,
  SharedEntryViewSchema,
  type UpdateEntry,
} from '@menu/shared/contracts';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

/**
 * HTTP access to the caller's entries, an item's entries sheet and share links.
 * Every response is validated against the shared contract.
 */
@Injectable({ providedIn: 'root' })
export class EntryApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `/api/${entryPath}`;

  /** The caller's diary, newest first, optionally for one venue or item. */
  async diary(query: DiaryQuery = {}): Promise<EntryWithItem[]> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) {
        params = params.set(key, value);
      }
    }
    const body = await firstValueFrom(this.http.get<unknown>(this.baseUrl, { params }));
    return z.array(EntryWithItemSchema).parse(body);
  }

  async get(id: string): Promise<Entry> {
    const body = await firstValueFrom(this.http.get<unknown>(`${this.baseUrl}/${id}`));
    return EntrySchema.parse(body);
  }

  /** The item, the caller's own entries on it, then other people's public ones. */
  async forItem(itemId: string): Promise<ItemEntries> {
    const body = await firstValueFrom(this.http.get<unknown>(`/api/${itemEntriesPath(itemId)}`));
    return ItemEntriesSchema.parse(body);
  }

  /** Any of the entry's fields; the API fills in the rest. */
  async create(itemId: string, input: CreateEntryInput): Promise<Entry> {
    const body = await firstValueFrom(
      this.http.post<unknown>(`/api/${itemEntriesPath(itemId)}`, input),
    );
    return EntrySchema.parse(body);
  }

  async update(id: string, input: UpdateEntry): Promise<Entry> {
    const body = await firstValueFrom(this.http.patch<unknown>(`${this.baseUrl}/${id}`, input));
    return EntrySchema.parse(body);
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.baseUrl}/${id}`));
  }

  /** Admin: take someone's entry off public view, or put it back. */
  async setHidden(id: string, hidden: boolean): Promise<void> {
    const input: SetEntryHidden = { hidden };
    await firstValueFrom(this.http.put(`${this.baseUrl}/${id}/hidden`, input));
  }

  /** What a share link shows; anyone may ask. */
  async shared(token: string): Promise<SharedEntryView> {
    const body = await firstValueFrom(this.http.get<unknown>(`/api/${sharedEntryPath(token)}`));
    return SharedEntryViewSchema.parse(body);
  }
}
