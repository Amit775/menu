import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ITEM_ID, item, VENUE_ID } from '../testing/fixtures';
import { DiscoverApiClient } from './discover.api-client';

describe('DiscoverApiClient', () => {
  let client: DiscoverApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(DiscoverApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('asks for the feed near the user with the chosen filters', async () => {
    const feed = client.feed({
      near: { lat: 32.08, lng: 34.78 },
      tagIds: ['a', 'b'],
      sort: 'score',
      maxPrice: null,
      offset: 0,
    });
    const request = http.expectOne((r) => r.url === '/api/discover/feed');
    expect(request.request.params.toString()).toBe(
      'lat=32.08&lng=34.78&sort=score&offset=0&tagIds=a,b',
    );
    request.flush({ items: [item], nextOffset: null });
    await expect(feed).resolves.toEqual({ items: [item], nextOffset: null });
  });

  it('leaves out the location when the user did not share it', async () => {
    const feed = client.feed({ near: null });
    const request = http.expectOne((r) => r.url === '/api/discover/feed');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ items: [], nextOffset: null });
    await feed;
  });

  it('rejects a feed that breaks the contract', async () => {
    const feed = client.feed({ near: null });
    http.expectOne((r) => r.url === '/api/discover/feed').flush({ items: [{ id: 'x' }] });
    await expect(feed).rejects.toThrow();
  });

  it('asks for map pins and validates them', async () => {
    const pins = client.map({ near: null, radiusKm: 10, tagIds: ['a'] });
    const request = http.expectOne((r) => r.url === '/api/discover/map');
    expect(request.request.params.toString()).toBe('radiusKm=10&tagIds=a');
    request.flush([{ venue: item.venue, location: { lat: 99, lng: 0 } }]);
    await expect(pins).rejects.toThrow();
  });

  it('loads an item page', async () => {
    const page = client.item(ITEM_ID, null);
    http.expectOne(`/api/discover/items/${ITEM_ID}`).flush({
      item,
      archived: false,
      tags: [],
      variations: [],
      history: [{ kind: 'added', at: '2026-09-01T10:00:00.000Z', listPrice: null }],
      alsoGoodHere: [],
    });
    await expect(page).resolves.toMatchObject({ item: { id: ITEM_ID } });
  });

  it('rejects a venue page that breaks the contract', async () => {
    const page = client.venue(VENUE_ID, null);
    http.expectOne(`/api/discover/venues/${VENUE_ID}`).flush({ venue: null });
    await expect(page).rejects.toThrow();
  });

  it('rejects an item page that breaks the contract', async () => {
    const page = client.item(ITEM_ID, null);
    http.expectOne(`/api/discover/items/${ITEM_ID}`).flush({ item: { id: ITEM_ID } });
    await expect(page).rejects.toThrow();
  });

  it('rejects search results that break the contract', async () => {
    const results = client.search('x');
    http.expectOne((r) => r.url === '/api/discover/search').flush({ items: 'nope' });
    await expect(results).rejects.toThrow();
  });

  it('searches', async () => {
    const results = client.search('בורגר');
    const request = http.expectOne((r) => r.url === '/api/discover/search');
    expect(request.request.params.get('q')).toBe('בורגר');
    request.flush({ items: [item], venues: [], tags: [] });
    await expect(results).resolves.toMatchObject({ items: [{ id: ITEM_ID }] });
  });

  it('loads and validates the tag vocabulary', async () => {
    const tags = client.tags();
    http.expectOne('/api/tags').flush([{ id: 'nope' }]);
    await expect(tags).rejects.toThrow();
  });
});
