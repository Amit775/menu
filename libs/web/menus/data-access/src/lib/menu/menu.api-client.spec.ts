import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { insights, item, section, tag, venue, VENUE_ID } from '../testing/fixtures';
import { MenuApiClient } from './menu.api-client';

describe('MenuApiClient', () => {
  let client: MenuApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(MenuApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('reads a venue', async () => {
    const result = client.venue(VENUE_ID);
    http.expectOne(`/api/venues/${VENUE_ID}`).flush(venue);
    await expect(result).resolves.toEqual(venue);
  });

  it('rejects a venue that breaks the contract', async () => {
    const result = client.venue(VENUE_ID);
    http.expectOne(`/api/venues/${VENUE_ID}`).flush({ ...venue, name: 'מוזס' });
    await expect(result).rejects.toThrow();
  });

  it('reads the venue’s menu sections', async () => {
    const result = client.sections(VENUE_ID);
    http.expectOne(`/api/venues/${VENUE_ID}/sections`).flush([section]);
    await expect(result).resolves.toEqual([section]);
  });

  it('rejects a section without a name', async () => {
    const result = client.sections(VENUE_ID);
    http.expectOne(`/api/venues/${VENUE_ID}/sections`).flush([{ ...section, name: undefined }]);
    await expect(result).rejects.toThrow();
  });

  it('adds an item to the venue', async () => {
    const input = {
      sectionId: section.id,
      name: { he: 'שקשוקה', en: null },
      listPrice: { value: 54, currency: 'ILS' as const },
    };
    const result = client.addItem(VENUE_ID, input);
    const request = http.expectOne(`/api/venues/${VENUE_ID}/items`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(input);
    request.flush(item);
    await expect(result).resolves.toEqual(item);
  });

  it('rejects an added item that breaks the contract', async () => {
    const result = client.addItem(VENUE_ID, {
      sectionId: section.id,
      name: { he: 'שקשוקה', en: null },
    });
    http.expectOne(`/api/venues/${VENUE_ID}/items`).flush({ ...item, state: 'unknown' });
    await expect(result).rejects.toThrow();
  });

  it('lists every venue, or only the caller’s own', async () => {
    const all = client.venues();
    http.expectOne('/api/venues').flush([venue]);
    await expect(all).resolves.toEqual([venue]);
    const owned = client.venues(true);
    http.expectOne('/api/venues?owned=true').flush([venue]);
    await expect(owned).resolves.toEqual([venue]);
  });

  it('creates and edits a venue', async () => {
    const input = { name: venue.name, address: venue.address, location: venue.location };
    const created = client.createVenue(input);
    const post = http.expectOne('/api/venues');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(input);
    post.flush(venue);
    await expect(created).resolves.toEqual(venue);
    const edited = client.updateVenue(VENUE_ID, { status: 'hidden' });
    const patch = http.expectOne(`/api/venues/${VENUE_ID}`);
    expect(patch.request.method).toBe('PATCH');
    patch.flush({ ...venue, status: 'hidden' });
    await expect(edited).resolves.toMatchObject({ status: 'hidden' });
  });

  it('adds, renames and reorders sections', async () => {
    const added = client.addSection(VENUE_ID, { name: { he: 'קינוחים', en: null } });
    const post = http.expectOne(`/api/venues/${VENUE_ID}/sections`);
    expect(post.request.method).toBe('POST');
    post.flush(section);
    await expect(added).resolves.toEqual(section);
    const renamed = client.renameSection(VENUE_ID, section.id, { name: { he: 'מנות', en: null } });
    const patch = http.expectOne(`/api/venues/${VENUE_ID}/sections/${section.id}`);
    expect(patch.request.method).toBe('PATCH');
    patch.flush(section);
    await expect(renamed).resolves.toEqual(section);
    const reordered = client.reorderSections(VENUE_ID, [section.id]);
    const put = http.expectOne(`/api/venues/${VENUE_ID}/sections/order`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual({ sectionIds: [section.id] });
    put.flush([section]);
    await expect(reordered).resolves.toEqual([section]);
  });

  it('reads the menu, edits an item and decides on it', async () => {
    const menu = client.items(VENUE_ID);
    http.expectOne(`/api/venues/${VENUE_ID}/items`).flush([item]);
    await expect(menu).resolves.toEqual([item]);
    const edited = client.updateItem(item.id, {
      listPrice: { value: 58, currency: 'ILS' as const },
    });
    const patch = http.expectOne(`/api/items/${item.id}`);
    expect(patch.request.method).toBe('PATCH');
    patch.flush({ ...item, listPrice: { value: 58, currency: 'ILS' as const } });
    await expect(edited).resolves.toMatchObject({
      listPrice: { value: 58, currency: 'ILS' as const },
    });
    const approved = client.decide(item.id, 'approve');
    const post = http.expectOne(`/api/items/${item.id}/approve`);
    expect(post.request.method).toBe('POST');
    post.flush({ ...item, state: 'approved' });
    await expect(approved).resolves.toMatchObject({ state: 'approved' });
    const merged = client.merge(item.id, section.id);
    const merge = http.expectOne(`/api/items/${item.id}/merge`);
    expect(merge.request.body).toEqual({ intoItemId: section.id });
    merge.flush({ ...item, state: 'merged', mergedIntoId: section.id });
    await expect(merged).resolves.toMatchObject({ state: 'merged' });
  });

  it('uploads an item photo as the raw body, removes it, and checks the item it returns', async () => {
    const photo = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
    const shown = { ...item, photoUrl: '/api/item-photos/abcdefghijklmnopqrstuv' };
    const set = client.setItemPhoto(item.id, photo);
    const put = http.expectOne(`/api/items/${item.id}/photo`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toBe(photo);
    put.flush(shown);
    await expect(set).resolves.toEqual(shown);
    const removed = client.removeItemPhoto(item.id);
    const remove = http.expectOne(`/api/items/${item.id}/photo`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ ...item, photoUrl: 'https://example.com/x.jpg' });
    await expect(removed).rejects.toThrow();
  });

  it('reads the pending queue and rejects an item that breaks the contract', async () => {
    const pending = client.pending();
    http.expectOne('/api/items/pending').flush([{ ...item, name: 'שקשוקה' }]);
    await expect(pending).rejects.toThrow();
  });

  it('keeps the tag vocabulary', async () => {
    const list = client.tags();
    http.expectOne('/api/tags').flush([tag]);
    await expect(list).resolves.toEqual([tag]);
    const added = client.addTag({ slug: tag.slug, name: tag.name, kind: tag.kind });
    http.expectOne('/api/tags').flush(tag);
    await expect(added).resolves.toEqual(tag);
    const renamed = client.updateTag(tag.id, { name: { he: 'בורגר', en: null } });
    const patch = http.expectOne(`/api/tags/${tag.id}`);
    expect(patch.request.method).toBe('PATCH');
    patch.flush(tag);
    await expect(renamed).resolves.toEqual(tag);
    const merged = client.mergeTag(tag.id, item.id);
    const merge = http.expectOne(`/api/tags/${tag.id}/merge`);
    expect(merge.request.body).toEqual({ intoTagId: item.id });
    merge.flush(null, { status: 204, statusText: 'No Content' });
    await expect(merged).resolves.toBeUndefined();
  });

  it('rejects a tag with a bad slug', async () => {
    const list = client.tags();
    http.expectOne('/api/tags').flush([{ ...tag, slug: 'Not A Slug' }]);
    await expect(list).rejects.toThrow();
  });

  it('reads a venue’s insights and rejects a private count under the floor', async () => {
    const read = client.insights(VENUE_ID);
    http.expectOne(`/api/discover/venues/${VENUE_ID}/insights`).flush(insights);
    await expect(read).resolves.toEqual(insights);
    const leaky = client.insights(VENUE_ID);
    const row = { ...insights.items[0], otherEntryCount: 1 };
    http.expectOne(`/api/discover/venues/${VENUE_ID}/insights`).flush({ items: [row] });
    await expect(leaky).rejects.toThrow();
  });
});
