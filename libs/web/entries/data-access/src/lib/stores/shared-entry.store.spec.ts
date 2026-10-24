import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EntryApiClient } from '../entry/entry.api-client';
import { itemRef, publicEntry, settle } from '../testing/fixtures';
import { SharedEntryStore } from './shared-entry.store';

describe('SharedEntryStore', () => {
  function setup(shared: EntryApiClient['shared']) {
    TestBed.configureTestingModule({
      providers: [SharedEntryStore, { provide: EntryApiClient, useValue: { shared } }],
    });
    return TestBed.inject(SharedEntryStore);
  }

  it('loads what the link shows', async () => {
    const view = { status: 'visible' as const, entry: publicEntry, item: itemRef };
    const store = setup(vi.fn().mockResolvedValue(view));
    store.load(() => 'abcdefghijklmnopqrstuv');
    await settle();
    expect(store.view()).toEqual(view);
    expect(store.status()).toBe('loaded');
  });

  it('keeps only the answer for the latest link', async () => {
    let answerFirst: (value: unknown) => void = () => undefined;
    const shared = vi
      .fn()
      .mockReturnValueOnce(new Promise((resolve) => (answerFirst = resolve)))
      .mockResolvedValueOnce({ status: 'removed' });
    const store = setup(shared);
    const token = signal('first-token-aaaaaaaaaaa');
    store.load(token);
    TestBed.tick();
    token.set('second-token-aaaaaaaaaa');
    await settle();
    answerFirst({ status: 'private' });
    await settle();
    expect(store.view()).toEqual({ status: 'removed' });
  });

  it('records a failed load', async () => {
    const store = setup(vi.fn().mockRejectedValue(new Error('offline')));
    store.load(() => 'abcdefghijklmnopqrstuv');
    await settle();
    expect(store.status()).toBe('error');
  });
});
