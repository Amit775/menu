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
