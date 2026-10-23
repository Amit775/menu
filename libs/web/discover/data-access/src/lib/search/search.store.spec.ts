import { TestBed } from '@angular/core/testing';
import { item } from '../testing/fixtures';
import { DiscoverApiClient } from '../api/discover.api-client';
import { SearchStore } from './search.store';

describe('SearchStore', () => {
  function setup(api: Partial<DiscoverApiClient>) {
    TestBed.configureTestingModule({
      providers: [SearchStore, { provide: DiscoverApiClient, useValue: api }],
    });
    return TestBed.inject(SearchStore);
  }

  it('searches for the trimmed text', async () => {
    const results = { items: [item], venues: [], tags: [] };
    const search = vi.fn().mockResolvedValue(results);
    const store = setup({ search });
    await store.search('  בורגר ');
    expect(search).toHaveBeenCalledWith('בורגר');
    expect(store.results()).toEqual(results);
  });

  it('does not search for blank text', async () => {
    const search = vi.fn();
    const store = setup({ search });
    await store.search('   ');
    expect(search).not.toHaveBeenCalled();
    expect(store.status()).toBe('idle');
  });

  it('records a failed search', async () => {
    const store = setup({ search: vi.fn().mockRejectedValue(new Error('offline')) });
    await store.search('בורגר');
    expect(store.status()).toBe('error');
  });

  it('ignores the answer to an older search', async () => {
    let slow: (value: unknown) => void = () => undefined;
    const search = vi
      .fn()
      .mockImplementationOnce(() => new Promise((resolve) => (slow = resolve)))
      .mockResolvedValueOnce({ items: [], venues: [], tags: [] });
    const store = setup({ search });
    const first = store.search('ב');
    await store.search('בורגר');
    slow({ items: [item], venues: [], tags: [] });
    await first;
    expect(store.results()?.items).toEqual([]);
  });
});
