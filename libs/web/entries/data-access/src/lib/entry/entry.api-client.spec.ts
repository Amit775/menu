import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { entry, ITEM_ID, itemRef, publicEntry, sheet, VENUE_ID } from '../testing/fixtures';
import { EntryApiClient } from './entry.api-client';

describe('EntryApiClient', () => {
  let client: EntryApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(EntryApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('reads the diary for one venue, each line with its item', async () => {
    const result = client.diary({ venueId: VENUE_ID });
    http.expectOne(`/api/entries?venueId=${VENUE_ID}`).flush([{ ...entry, item: itemRef }]);
    await expect(result).resolves.toEqual([{ ...entry, item: itemRef }]);
  });

  it('rejects a diary line without its item', async () => {
    const result = client.diary();
    http.expectOne('/api/entries').flush([entry]);
    await expect(result).rejects.toThrow();
  });

  it('reads an item’s entries sheet', async () => {
    const result = client.forItem(ITEM_ID);
    http.expectOne(`/api/items/${ITEM_ID}/entries`).flush(sheet);
    await expect(result).resolves.toEqual(sheet);
  });

  it('rejects a sheet whose public entries carry no author name', async () => {
    const result = client.forItem(ITEM_ID);
    http
      .expectOne(`/api/items/${ITEM_ID}/entries`)
      .flush({ ...sheet, others: [{ ...publicEntry, authorName: undefined }] });
    await expect(result).rejects.toThrow();
  });

  it('logs an entry on the item', async () => {
    const result = client.create(ITEM_ID, { rating: 5, visibility: 'private' });
    const request = http.expectOne(`/api/items/${ITEM_ID}/entries`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ rating: 5, visibility: 'private' });
    request.flush(entry);
    await expect(result).resolves.toEqual(entry);
  });

  it('reads, edits and deletes one entry', async () => {
    const read = client.get(entry.id);
    http.expectOne(`/api/entries/${entry.id}`).flush(entry);
    await expect(read).resolves.toEqual(entry);

    const edit = client.update(entry.id, { visibility: 'public' });
    const patch = http.expectOne(`/api/entries/${entry.id}`);
    expect(patch.request.method).toBe('PATCH');
    patch.flush({ ...entry, visibility: 'public', shareToken: 'abcdefghijklmnopqrstuv' });
    await expect(edit).resolves.toMatchObject({ visibility: 'public' });

    const remove = client.remove(entry.id);
    const request = http.expectOne(`/api/entries/${entry.id}`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await expect(remove).resolves.toBeUndefined();
  });

  it('rejects an edited entry that breaks the contract', async () => {
    const edit = client.update(entry.id, { rating: 3 });
    http.expectOne(`/api/entries/${entry.id}`).flush({ ...entry, rating: 9 });
    await expect(edit).rejects.toThrow();
  });

  it('reads what a share link shows', async () => {
    const result = client.shared('abcdefghijklmnopqrstuv');
    http.expectOne('/api/shared/abcdefghijklmnopqrstuv').flush({ status: 'private' });
    await expect(result).resolves.toEqual({ status: 'private' });
  });

  it('rejects a visible share without its item', async () => {
    const result = client.shared('abcdefghijklmnopqrstuv');
    http
      .expectOne('/api/shared/abcdefghijklmnopqrstuv')
      .flush({ status: 'visible', entry: publicEntry });
    await expect(result).rejects.toThrow();
  });
});
