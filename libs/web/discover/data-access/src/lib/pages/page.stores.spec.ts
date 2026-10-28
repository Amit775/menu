import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ITEM_ID, item, VENUE_ID } from '../testing/fixtures';
import { DiscoverApiClient } from '../api/discover.api-client';
import { DeviceLocation } from '@menu/web/shared/util-device';
import { ItemPageStore, SavedPageStore, VenuePageStore } from './page.stores';

describe('page stores', () => {
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

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
    const page = { item, archived: false, tags: [], history: [], alsoGoodHere: [] };
    const { items } = setup({ item: vi.fn().mockResolvedValue(page) });
    items.load(() => ITEM_ID);
    await settle();
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
    items.load(() => ITEM_ID);
    await settle();
    expect(items.status()).toBe('not-found');
    items.reload();
    await settle();
    expect(items.status()).toBe('error');
  });

  it('treats an id that is not one as missing', async () => {
    const { items } = setup({
      item: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 400 })),
    });
    items.load(() => 'foo');
    await settle();
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
    const id = signal(ITEM_ID);
    items.load(id);
    TestBed.tick();
    id.set('other');
    await settle();
    slow({ item });
    await settle();
    expect(items.page()).toEqual(other);
  });

  it('reports a venue that failed to load', async () => {
    const { venues } = setup({ venue: vi.fn().mockRejectedValue(new Error('offline')) });
    venues.load(() => VENUE_ID);
    await settle();
    expect(venues.status()).toBe('error');
  });

  it('loads a venue page and reports a missing venue', async () => {
    const venue = vi
      .fn()
      .mockResolvedValueOnce({ venue: { id: VENUE_ID } })
      .mockRejectedValueOnce(new HttpErrorResponse({ status: 404 }));
    const { venues } = setup({ venue });
    venues.load(() => VENUE_ID);
    await settle();
    expect(venues.status()).toBe('loaded');
    venues.reload();
    await settle();
    expect(venues.status()).toBe('not-found');
    expect(venues.page()).toBeNull();
  });

  it('loads the Want to try list near the user, and reports a failure', async () => {
    const saved = vi.fn().mockResolvedValueOnce([item]).mockRejectedValueOnce(new Error('offline'));
    TestBed.configureTestingModule({
      providers: [
        SavedPageStore,
        { provide: DiscoverApiClient, useValue: { saved } },
        {
          provide: DeviceLocation,
          useValue: { locate: () => Promise.resolve({ lat: 32, lng: 34 }) },
        },
      ],
    });
    const store = TestBed.inject(SavedPageStore);
    await settle();
    expect(store.items()).toEqual([item]);
    expect(saved).toHaveBeenCalledWith({ lat: 32, lng: 34 });
    store.reload();
    await settle();
    expect(store.status()).toBe('error');
  });
});
