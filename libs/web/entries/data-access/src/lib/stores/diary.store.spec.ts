import { TestBed } from '@angular/core/testing';
import { EntryApiClient } from '../entry/entry.api-client';
import { entry, itemRef } from '../testing/fixtures';
import { DiaryStore } from './diary.store';

describe('DiaryStore', () => {
  function setup(diary: EntryApiClient['diary']) {
    TestBed.configureTestingModule({
      providers: [DiaryStore, { provide: EntryApiClient, useValue: { diary } }],
    });
    return TestBed.inject(DiaryStore);
  }

  it('loads the caller’s diary', async () => {
    const store = setup(vi.fn().mockResolvedValue([{ ...entry, item: itemRef }]));
    await store.load();
    expect(store.status()).toBe('loaded');
    expect(store.entries()[0]?.item.name.he).toBe('המבורגר הקלאסי');
  });

  it('narrows the diary to one venue', async () => {
    const diary = vi.fn().mockResolvedValue([]);
    await setup(diary).load({ venueId: entry.venueId });
    expect(diary).toHaveBeenCalledWith({ venueId: entry.venueId });
  });

  it('records a failed load', async () => {
    const store = setup(vi.fn().mockRejectedValue(new Error('offline')));
    await store.load();
    expect(store.status()).toBe('error');
  });
});
