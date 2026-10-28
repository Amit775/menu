import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EntryApiClient } from '../entry/entry.api-client';
import { settle, stats } from '../testing/fixtures';
import { PersonalStatsStore } from './personal-stats.store';

describe('PersonalStatsStore', () => {
  function setup(read: EntryApiClient['stats']) {
    TestBed.configureTestingModule({
      providers: [PersonalStatsStore, { provide: EntryApiClient, useValue: { stats: read } }],
    });
    return TestBed.inject(PersonalStatsStore);
  }

  it('loads the caller’s stats when asked to', async () => {
    const read = vi.fn().mockResolvedValue(stats);
    const store = setup(read);
    const wanted = signal(false);
    store.load(wanted);
    await settle();
    expect(read).not.toHaveBeenCalled();
    expect(store.stats()).toBeNull();
    wanted.set(true);
    await settle();
    expect(store.stats()).toEqual(stats);
    expect(store.status()).toBe('loaded');
  });

  it('shows nothing when the stats cannot be read', async () => {
    const store = setup(vi.fn().mockRejectedValue(new Error('offline')));
    store.load(() => true);
    await settle();
    expect(store.stats()).toBeNull();
    expect(store.status()).toBe('error');
  });
});
