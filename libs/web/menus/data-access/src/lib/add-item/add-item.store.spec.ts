import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MenuApiClient } from '../menu/menu.api-client';
import { item, section, venue, VENUE_ID, settle } from '../testing/fixtures';
import { AddItemStore } from './add-item.store';

describe('AddItemStore', () => {
  function setup(api: Partial<MenuApiClient>) {
    TestBed.configureTestingModule({
      providers: [AddItemStore, { provide: MenuApiClient, useValue: api }],
    });
    return TestBed.inject(AddItemStore);
  }

  it('loads the venue and its sections', async () => {
    const store = setup({
      venue: vi.fn().mockResolvedValue(venue),
      sections: vi.fn().mockResolvedValue([section]),
    });
    store.load(() => VENUE_ID);
    await settle();
    expect(store.status()).toBe('loaded');
    expect(store.venue()).toEqual(venue);
    expect(store.sections()).toEqual([section]);
  });

  it('reads an unknown venue as not found, and other failures as errors', async () => {
    const missing = setup({
      venue: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 404 })),
      sections: vi.fn().mockResolvedValue([]),
    });
    missing.load(() => VENUE_ID);
    await settle();
    expect(missing.status()).toBe('not-found');
    TestBed.resetTestingModule();
    const failed = setup({
      venue: vi.fn().mockResolvedValue(venue),
      sections: vi.fn().mockRejectedValue(new Error('offline')),
    });
    failed.load(() => VENUE_ID);
    await settle();
    expect(failed.status()).toBe('error');
  });

  it('keeps the venue asked for last when answers arrive out of order', async () => {
    const other = { ...venue, id: '1c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10' };
    let answerFirst: (value: typeof venue) => void = () => undefined;
    const store = setup({
      venue: vi
        .fn()
        .mockReturnValueOnce(new Promise((resolve) => (answerFirst = resolve)))
        .mockResolvedValueOnce(other),
      sections: vi.fn().mockResolvedValue([section]),
    });
    const id = signal(VENUE_ID);
    store.load(id);
    TestBed.tick();
    id.set(other.id);
    await settle();
    answerFirst(venue);
    await settle();
    expect(store.venue()).toEqual(other);
  });

  it('adds the item at the loaded venue', async () => {
    const addItem = vi.fn().mockResolvedValue(item);
    const store = setup({
      venue: vi.fn().mockResolvedValue(venue),
      sections: vi.fn().mockResolvedValue([section]),
      addItem,
    });
    store.load(() => VENUE_ID);
    await settle();
    const input = { sectionId: section.id, name: { he: 'שקשוקה' }, listPrice: null };
    await expect(store.add(input)).resolves.toEqual(item);
    expect(addItem).toHaveBeenCalledWith(VENUE_ID, input);
  });

  it('refuses to add before the venue is loaded', async () => {
    const addItem = vi.fn();
    const store = setup({ addItem });
    await expect(
      store.add({ sectionId: section.id, name: { he: 'שקשוקה' }, listPrice: null }),
    ).rejects.toThrow('Load the venue first.');
    expect(addItem).not.toHaveBeenCalled();
  });
});
