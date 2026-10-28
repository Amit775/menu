import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import {
  type CreateEntryInput,
  type DiaryQuery,
  type Entry,
  entryPath,
  entryPhotoPath,
  EntrySchema,
  type EntryWithItem,
  EntryWithItemSchema,
  type ItemEntries,
  itemEntriesPath,
  type PersonalStats,
  personalStatsPath,
  PersonalStatsSchema,
  savedItemPath,
  ItemEntriesSchema,
  sharedEntryPath,
  type SetEntryHidden,
  type SharedEntryView,
  SharedEntryViewSchema,
  type UpdateEntry,
} from '@menu/shared/contracts';
import { firstValueFrom } from 'rxjs';
import { z } from 'zod';

@Service()
export class EntryApiClient {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `/api/${entryPath}`;

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

  async stats(): Promise<PersonalStats> {
    const body = await firstValueFrom(this.http.get<unknown>(`/api/${personalStatsPath}`));
    return PersonalStatsSchema.parse(body);
  }

  async get(id: string): Promise<Entry> {
    const body = await firstValueFrom(this.http.get<unknown>(`${this.baseUrl}/${id}`));
    return EntrySchema.parse(body);
  }

  async forItem(itemId: string): Promise<ItemEntries> {
    const body = await firstValueFrom(this.http.get<unknown>(`/api/${itemEntriesPath(itemId)}`));
    return ItemEntriesSchema.parse(body);
  }

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

  async unsave(itemId: string): Promise<void> {
    await firstValueFrom(this.http.delete(`/api/${savedItemPath}/${encodeURIComponent(itemId)}`));
  }

  async setPhoto(id: string, photo: Blob): Promise<Entry> {
    const body = await firstValueFrom(this.http.put<unknown>(`/api/${entryPhotoPath(id)}`, photo));
    return EntrySchema.parse(body);
  }

  async removePhoto(id: string): Promise<Entry> {
    const body = await firstValueFrom(this.http.delete<unknown>(`/api/${entryPhotoPath(id)}`));
    return EntrySchema.parse(body);
  }

  async setHidden(id: string, hidden: boolean): Promise<void> {
    const input: SetEntryHidden = { hidden };
    await firstValueFrom(this.http.put(`${this.baseUrl}/${id}/hidden`, input));
  }

  async shared(token: string): Promise<SharedEntryView> {
    const body = await firstValueFrom(this.http.get<unknown>(`/api/${sharedEntryPath(token)}`));
    return SharedEntryViewSchema.parse(body);
  }
}
