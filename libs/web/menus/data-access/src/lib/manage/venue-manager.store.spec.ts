import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MenuApiClient } from '../menu/menu.api-client';
import { insights, item, section, tag, venue, VENUE_ID, settle } from '../testing/fixtures';
import { VenueManagerStore } from './venue-manager.store';

describe('VenueManagerStore', () => {
  const approved = {
    ...item,
    id: '6b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
    state: 'approved' as const,
    submittedByMe: false,
  };
  const drinks = {
    ...section,
    id: '4c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'שתייה', en: null },
    position: 1,
  };

  function setup(api: Partial<MenuApiClient> = {}) {
    TestBed.configureTestingModule({
      providers: [
        VenueManagerStore,
        {
          provide: MenuApiClient,
          useValue: {
            venue: vi.fn().mockResolvedValue(venue),
            sections: vi.fn().mockResolvedValue([drinks, section]),
            items: vi.fn().mockResolvedValue([item, approved]),
            tags: vi.fn().mockResolvedValue([tag]),
            ...api,
          },
        },
      ],
    });
    return TestBed.inject(VenueManagerStore);
  }

  it('splits the venue’s items into the pending queue and the menu by section', async () => {
    const store = setup();
    store.load(() => VENUE_ID);
    await settle();
    expect(store.status()).toBe('loaded');
    expect(store.pending()).toEqual([item]);
    expect(store.menu().map((view) => [view.section.id, view.items.map((i) => i.id)])).toEqual([
      [section.id, [approved.id]],
      [drinks.id, []],
    ]);
    expect(store.tagsById().get(tag.id)).toEqual(tag);
  });

  it('reads a venue the caller may not manage as not found', async () => {
    const store = setup({
      items: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 403 })),
    });
    store.load(() => VENUE_ID);
    await settle();
    expect(store.status()).toBe('not-found');
  });

  it('records other failures as errors', async () => {
    const store = setup({ venue: vi.fn().mockRejectedValue(new Error('offline')) });
    store.load(() => VENUE_ID);
    await settle();
    expect(store.status()).toBe('error');
  });

  it('takes an approved item out of the queue and onto the menu', async () => {
    const decide = vi.fn().mockResolvedValue({ ...item, state: 'approved' });
    const store = setup({ decide });
    store.load(() => VENUE_ID);
    await settle();
    await store.decide(item.id, 'approve');
    expect(decide).toHaveBeenCalledWith(item.id, 'approve');
    expect(store.pending()).toEqual([]);
    expect(store.menu()[0]?.items.map((i) => i.id)).toEqual([item.id, approved.id]);
  });

  it('keeps the item in the queue when a decision fails', async () => {
    const store = setup({ decide: vi.fn().mockRejectedValue(new Error('offline')) });
    store.load(() => VENUE_ID);
    await settle();
    await expect(store.decide(item.id, 'reject')).rejects.toThrow('offline');
    expect(store.pending()).toEqual([item]);
  });

  it('merges a duplicate into an existing item', async () => {
    const merge = vi
      .fn()
      .mockResolvedValue({ ...item, state: 'merged', mergedIntoId: approved.id });
    const store = setup({ merge });
    store.load(() => VENUE_ID);
    await settle();
    await store.merge(item.id, approved.id);
    expect(merge).toHaveBeenCalledWith(item.id, approved.id);
    expect(store.pending()).toEqual([]);
  });

  it('adds and edits items on the menu', async () => {
    const added = { ...approved, id: '5b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10', position: 1 };
    const addItem = vi.fn().mockResolvedValue(added);
    const updateItem = vi
      .fn()
      .mockResolvedValue({ ...approved, listPrice: { value: 60, currency: 'ILS' as const } });
    const store = setup({ addItem, updateItem });
    store.load(() => VENUE_ID);
    await settle();
    await store.addItem({ sectionId: section.id, name: added.name });
    expect(addItem).toHaveBeenCalledWith(VENUE_ID, { sectionId: section.id, name: added.name });
    await store.updateItem(approved.id, { listPrice: { value: 60, currency: 'ILS' as const } });
    expect(store.menu()[0]?.items.map((i) => [i.id, i.listPrice])).toEqual([
      [approved.id, { value: 60, currency: 'ILS' }],
      [added.id, { value: 54, currency: 'ILS' }],
    ]);
  });

  it('puts a photo on an item and takes it off', async () => {
    const shown = { ...approved, photoUrl: '/api/item-photos/abcdefghijklmnopqrstuv' };
    const setItemPhoto = vi.fn().mockResolvedValue(shown);
    const removeItemPhoto = vi.fn().mockResolvedValue(approved);
    const store = setup({ setItemPhoto, removeItemPhoto });
    store.load(() => VENUE_ID);
    await settle();
    const photo = new Blob([new Uint8Array([1])]);
    await store.setItemPhoto(approved.id, photo);
    expect(setItemPhoto).toHaveBeenCalledWith(approved.id, photo);
    expect(store.items().find((i) => i.id === approved.id)?.photoUrl).toBe(shown.photoUrl);
    await store.setItemPhoto(approved.id, null);
    expect(removeItemPhoto).toHaveBeenCalledWith(approved.id);
    expect(store.items().find((i) => i.id === approved.id)?.photoUrl).toBeNull();
  });

  it('rejects when the photo upload fails, keeping the item as it was', async () => {
    const store = setup({ setItemPhoto: vi.fn().mockRejectedValue(new Error('413')) });
    store.load(() => VENUE_ID);
    await settle();
    await expect(store.setItemPhoto(approved.id, new Blob([]))).rejects.toThrow('413');
    expect(store.items().find((i) => i.id === approved.id)?.photoUrl).toBeNull();
  });

  it('adds, renames and moves sections', async () => {
    const desserts = { ...section, id: '3c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10', position: 2 };
    const reorderSections = vi
      .fn()
      .mockResolvedValue([{ ...drinks, position: 0 }, { ...section, position: 1 }, desserts]);
    const store = setup({
      addSection: vi.fn().mockResolvedValue(desserts),
      renameSection: vi.fn().mockResolvedValue({ ...desserts, name: { he: 'קינוחים', en: null } }),
      reorderSections,
    });
    store.load(() => VENUE_ID);
    await settle();
    await store.addSection(desserts.name);
    await store.renameSection(desserts.id, { he: 'קינוחים', en: null });
    await store.moveSection(drinks.id, -1);
    expect(reorderSections).toHaveBeenCalledWith(VENUE_ID, [drinks.id, section.id, desserts.id]);
    expect(store.menu().map((view) => view.section.id)).toEqual([
      drinks.id,
      section.id,
      desserts.id,
    ]);
  });

  it('does not move the first section further up', async () => {
    const reorderSections = vi.fn();
    const store = setup({ reorderSections });
    store.load(() => VENUE_ID);
    await settle();
    await store.moveSection(section.id, -1);
    expect(reorderSections).not.toHaveBeenCalled();
  });

  it('loads insights once', async () => {
    const insightsCall = vi.fn().mockResolvedValue(insights);
    const store = setup({ insights: insightsCall });
    store.load(() => VENUE_ID);
    await settle();
    await store.loadInsights();
    await store.loadInsights();
    expect(insightsCall).toHaveBeenCalledTimes(1);
    expect(store.insights()).toEqual(insights);
  });

  it('rejects when insights fail, leaving none', async () => {
    const store = setup({
      insights: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 500 })),
    });
    store.load(() => VENUE_ID);
    await settle();
    await expect(store.loadInsights()).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(store.insights()).toBeNull();
  });

  it('drops insights that arrive after another venue loaded', async () => {
    let answer: (value: typeof insights) => void = () => undefined;
    const other = { ...venue, id: '1c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10' };
    const store = setup({
      venue: vi.fn().mockResolvedValueOnce(venue).mockResolvedValueOnce(other),
      insights: vi.fn(() => new Promise<typeof insights>((resolve) => (answer = resolve))),
    });
    const id = signal(VENUE_ID);
    store.load(id);
    await settle();
    const loading = store.loadInsights();
    id.set(other.id);
    await settle();
    answer(insights);
    await loading;
    expect(store.insights()).toBeNull();
  });

  it('reloads insights after a decision changes the menu', async () => {
    const insightsCall = vi.fn().mockResolvedValue(insights);
    const store = setup({
      insights: insightsCall,
      decide: vi.fn().mockResolvedValue({ ...item, state: 'approved' }),
    });
    store.load(() => VENUE_ID);
    await settle();
    await store.loadInsights();
    await store.decide(item.id, 'approve');
    expect(store.insights()).toBeNull();
    await store.loadInsights();
    expect(insightsCall).toHaveBeenCalledTimes(2);
  });
});
