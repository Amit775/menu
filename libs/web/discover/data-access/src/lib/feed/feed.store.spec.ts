import { TestBed } from '@angular/core/testing';
import { AUTH_BACKEND, FakeAuthBackend } from '@menu/web/shared/util-auth';
import { DataChanges } from '@menu/web/shared/util-events';
import { item, VENUE_ID } from '../testing/fixtures';
import { DiscoverApiClient } from '../api/discover.api-client';
import { DeviceLocation } from '@menu/web/shared/util-device';
import { FeedStore } from './feed.store';

describe('FeedStore', () => {
  const near = { lat: 32.08, lng: 34.78 };
  const unranked = { ...item, id: '1e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10', score: null };

  function setup(api: Partial<DiscoverApiClient>, backend = new FakeAuthBackend()) {
    TestBed.configureTestingModule({
      providers: [
        { provide: AUTH_BACKEND, useValue: backend },
        { provide: DiscoverApiClient, useValue: api },
        {
          provide: DeviceLocation,
          useValue: { locate: () => Promise.resolve(near), position: () => near },
        },
      ],
    });
    return TestBed.inject(FeedStore);
  }

  it('loads the first page near the user and splits ranked from unranked', async () => {
    const feed = vi.fn().mockResolvedValue({ items: [item, unranked], nextOffset: 20 });
    const store = setup({ feed });
    await store.load();
    expect(feed).toHaveBeenCalledWith(expect.objectContaining({ near, mode: 'reels', offset: 0 }));
    expect(store.ranked()).toEqual([item]);
    expect(store.unranked()).toEqual([unranked]);
    expect(store.status()).toBe('loaded');
  });

  it('appends the next page', async () => {
    const feed = vi
      .fn()
      .mockResolvedValueOnce({ items: [item], nextOffset: 1 })
      .mockResolvedValueOnce({ items: [unranked], nextOffset: null });
    const store = setup({ feed });
    await store.load();
    await store.loadMore();
    expect(store.items()).toEqual([item, unranked]);
    await store.loadMore();
    expect(feed).toHaveBeenCalledTimes(2);
  });

  it('reloads from the start when a filter changes', async () => {
    const feed = vi.fn().mockResolvedValue({ items: [item], nextOffset: null });
    const store = setup({ feed });
    await store.load();
    await store.setFilters({ tagIds: ['t1'], maxPrice: 8000 });
    expect(feed).toHaveBeenLastCalledWith(
      expect.objectContaining({ tagIds: ['t1'], maxPrice: 8000, offset: 0 }),
    );
    expect(store.filterCount()).toBe(2);
  });

  it('asks for the list order when switching to the list', async () => {
    const feed = vi.fn().mockResolvedValue({ items: [item], nextOffset: null });
    const store = setup({ feed });
    await store.setView('list');
    expect(feed).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'list' }));
  });

  it('loads venue pins for the map with the same filters', async () => {
    const pin = {
      venue: item.venue,
      location: { lat: 32.06, lng: 34.77 },
      itemCount: 2,
      bestScore: 4.6,
      writtenByMe: false,
    };
    const map = vi.fn().mockResolvedValue([pin]);
    const feed = vi.fn();
    const store = setup({ map, feed });
    await store.setFilters({ tagIds: ['t1'] });
    await store.setView('map');
    expect(map).toHaveBeenCalledWith({ near, radiusKm: 5, tagIds: ['t1'] });
    expect(store.pins()).toEqual([pin]);
    expect(store.near()).toEqual(near);
    await store.loadMore();
    expect(feed).toHaveBeenCalledTimes(1);
  });

  it('records a failed map load, and ignores pins that arrive after leaving the map', async () => {
    let late: (value: unknown) => void = () => undefined;
    const map = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(() => new Promise((resolve) => (late = resolve)));
    const feed = vi.fn().mockResolvedValue({ items: [item], nextOffset: null });
    const store = setup({ map, feed });
    await store.setView('map');
    expect(store.status()).toBe('error');
    const loading = store.reload();
    await store.setView('list');
    late([
      {
        venue: item.venue,
        location: { lat: 1, lng: 1 },
        itemCount: 1,
        bestScore: null,
        writtenByMe: false,
      },
    ]);
    await loading;
    expect(store.pins()).toEqual([]);
    expect(store.status()).toBe('loaded');
  });

  it('records a failed load and tries again on the next load', async () => {
    const feed = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({ items: [item], nextOffset: null });
    const store = setup({ feed });
    await store.load();
    expect(store.status()).toBe('error');
    await store.load();
    expect(store.items()).toEqual([item]);
  });

  it('keeps only the latest answer when filters change quickly', async () => {
    let slow: (value: unknown) => void = () => undefined;
    const feed = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (slow = resolve)))
      .mockResolvedValueOnce({ items: [unranked], nextOffset: null });
    const store = setup({ feed });
    const first = store.setFilters({ radiusKm: 10 });
    await store.setFilters({ radiusKm: 2 });
    slow({ items: [item], nextOffset: null });
    await first;
    expect(store.items()).toEqual([unranked]);
  });

  it('fetches again after another account signs in', async () => {
    const feed = vi.fn().mockResolvedValue({ items: [item], nextOffset: null });
    const backend = new FakeAuthBackend();
    const store = setup({ feed }, backend);
    TestBed.tick();
    await store.load();
    store.setReelIndex(4);
    backend.signIn();
    TestBed.tick();
    expect(store.status()).toBe('idle');
    await store.load();
    expect(feed).toHaveBeenCalledTimes(2);
    expect(store.reelIndex()).toBe(0);
  });

  it('fetches again after an entry changes, from the first reel when the feed got shorter', async () => {
    const feed = vi.fn().mockResolvedValue({ items: [item, unranked, item], nextOffset: null });
    const store = setup({ feed });
    TestBed.tick();
    await store.load();
    store.setReelIndex(2);
    TestBed.inject(DataChanges).notify('entries');
    TestBed.tick();
    expect(store.status()).toBe('idle');
    feed.mockResolvedValue({ items: [item], nextOffset: null });
    await store.load();
    expect(feed).toHaveBeenCalledTimes(2);
    expect(store.reelIndex()).toBe(0);
  });

  it('keeps the reel when the refreshed feed still reaches it', async () => {
    const feed = vi.fn().mockResolvedValue({ items: [item, unranked, item], nextOffset: null });
    const store = setup({ feed });
    TestBed.tick();
    await store.load();
    store.setReelIndex(2);
    TestBed.inject(DataChanges).notify('entries');
    TestBed.tick();
    await store.load();
    expect(feed).toHaveBeenCalledTimes(2);
    expect(store.reelIndex()).toBe(2);
  });

  it('does not ask twice while a page is loading, and reports a failed next page', async () => {
    const feed = vi
      .fn()
      .mockResolvedValueOnce({ items: [item], nextOffset: 1 })
      .mockRejectedValueOnce(new Error('offline'));
    const store = setup({ feed });
    await store.load();
    const more = store.loadMore();
    await store.loadMore();
    await more;
    expect(feed).toHaveBeenCalledTimes(2);
    expect(store.status()).toBe('error');
    expect(store.items()).toEqual([item]);
  });

  it('does nothing when the view does not change', async () => {
    const feed = vi.fn();
    const store = setup({ feed });
    await store.setView('reels');
    expect(feed).not.toHaveBeenCalled();
  });

  it('loads a venue’s other items once', async () => {
    const venue = vi
      .fn()
      .mockResolvedValue({ sections: [{ items: [item] }, { items: [unranked] }] });
    const store = setup({ venue });
    await store.loadVenueItems(VENUE_ID);
    await store.loadVenueItems(VENUE_ID);
    expect(store.venueItems()[VENUE_ID]).toEqual([item, unranked]);
    expect(venue).toHaveBeenCalledTimes(1);
  });

  it('carries on without tags when they fail to load', async () => {
    const store = setup({ tags: vi.fn().mockRejectedValue(new Error('offline')) });
    await store.loadTags();
    expect(store.tags()).toEqual([]);
  });
});
