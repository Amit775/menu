import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ITEM_ID, item, VENUE_ID } from '../testing/fixtures';
import { DiscoverApiClient } from '../api/discover.api-client';
import { DeviceLocation } from '../location/device-location';
import { ItemPageStore, VenuePageStore } from './page.stores';

describe('page stores', () => {
  function setup(api: Partial<DiscoverApiClient>) {
    TestBed.configureTestingModule({
      providers: [
        ItemPageStore,
        VenuePageStore,
        { provide: DiscoverApiClient, useValue: api },
        { provide: DeviceLocation, useValue: { locate: () => Promise.resolve(null) } },
      ],
    });
    return { items: TestBed.inject(ItemPageStore), venues: TestBed.inject(VenuePageStore) };
  }

  it('loads an item page', async () => {
    const page = { item, archived: false, tags: [], priceHistory: [], alsoGoodHere: [] };
    const { items } = setup({ item: vi.fn().mockResolvedValue(page) });
    await items.load(ITEM_ID);
    expect(items.page()).toEqual(page);
    expect(items.status()).toBe('loaded');
  });

  it('tells a missing item from a failed load', async () => {
    const { items } = setup({
      item: vi
        .fn()
        .mockRejectedValueOnce(new HttpErrorResponse({ status: 404 }))
        .mockRejectedValueOnce(new Error('offline')),
    });
    await items.load(ITEM_ID);
    expect(items.status()).toBe('not-found');
    await items.load(ITEM_ID);
    expect(items.status()).toBe('error');
  });

  it('treats an id that is not one as missing', async () => {
    const { items } = setup({
      item: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 400 })),
    });
    await items.load('foo');
    expect(items.status()).toBe('not-found');
  });

  it('keeps the page of the latest id when an older load answers last', async () => {
    let slow: (value: unknown) => void = () => undefined;
    const other = { item: { ...item, id: 'other' } };
    const load = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (slow = resolve)))
      .mockResolvedValueOnce(other);
    const { items } = setup({ item: load });
    const first = items.load(ITEM_ID);
    await items.load('other');
    slow({ item });
    await first;
    expect(items.page()).toEqual(other);
  });

  it('reports a venue that failed to load', async () => {
    const { venues } = setup({ venue: vi.fn().mockRejectedValue(new Error('offline')) });
    await venues.load(VENUE_ID);
    expect(venues.status()).toBe('error');
  });

  it('loads a venue page and reports a missing venue', async () => {
    const venue = vi
      .fn()
      .mockResolvedValueOnce({ venue: { id: VENUE_ID } })
      .mockRejectedValueOnce(new HttpErrorResponse({ status: 404 }));
    const { venues } = setup({ venue });
    await venues.load(VENUE_ID);
    expect(venues.status()).toBe('loaded');
    await venues.load(VENUE_ID);
    expect(venues.status()).toBe('not-found');
    expect(venues.page()).toBeNull();
  });
});
