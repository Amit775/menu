import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { DataChanges } from '@menu/web/shared/util-events';
import { EntryApiClient } from '../entry/entry.api-client';
import { LastVisibility } from '../entry/last-visibility';
import { entry, ITEM_ID, publicEntry, sheet } from '../testing/fixtures';
import { ItemEntriesStore } from './item-entries.store';

describe('ItemEntriesStore', () => {
  const older = { ...entry, id: '2e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10', pricePaid: 5900 };

  function setup(api: Partial<EntryApiClient>) {
    const remember = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        ItemEntriesStore,
        { provide: EntryApiClient, useValue: api },
        { provide: LastVisibility, useValue: { get: () => 'private', set: remember } },
      ],
    });
    const changes = TestBed.inject(DataChanges);
    return {
      store: TestBed.inject(ItemEntriesStore),
      remember,
      version: changes.version('entries'),
    };
  }

  it('loads the item with the caller’s entries and public ones', async () => {
    const { store } = setup({ forItem: vi.fn().mockResolvedValue(sheet) });
    await store.load(ITEM_ID);
    expect(store.status()).toBe('loaded');
    expect(store.mine()).toEqual([entry]);
    expect(store.others()).toEqual(sheet.others);
  });

  it('knows what the user paid last time, skipping entries without a price', async () => {
    const latest = { ...entry, pricePaid: null };
    const { store } = setup({
      forItem: vi.fn().mockResolvedValue({ ...sheet, mine: [latest, older] }),
    });
    await store.load(ITEM_ID);
    expect(store.lastPaid()).toBe(5900);
  });

  it('reads an unknown item as not found', async () => {
    const { store } = setup({
      forItem: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 404 })),
    });
    await store.load(ITEM_ID);
    expect(store.status()).toBe('not-found');
    expect(store.lastPaid()).toBeNull();
  });

  it('records a failed load', async () => {
    const { store } = setup({ forItem: vi.fn().mockRejectedValue(new Error('offline')) });
    await store.load(ITEM_ID);
    expect(store.status()).toBe('error');
  });

  it('puts a new entry on top, remembers its visibility and tells discover', async () => {
    const created = {
      ...entry,
      id: '3e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
      visibility: 'public' as const,
    };
    const create = vi.fn().mockResolvedValue(created);
    const { store, remember, version } = setup({
      forItem: vi.fn().mockResolvedValue(sheet),
      create,
    });
    await store.load(ITEM_ID);
    await store.create(ITEM_ID, { rating: 4, visibility: 'public' });
    expect(create).toHaveBeenCalledWith(ITEM_ID, { rating: 4, visibility: 'public' });
    expect(store.mine().map((mine) => mine.id)).toEqual([created.id, entry.id]);
    expect(remember).toHaveBeenCalledWith('public');
    expect(version()).toBe(1);
  });

  it('changes nothing when saving fails', async () => {
    const { store, version } = setup({
      forItem: vi.fn().mockResolvedValue(sheet),
      create: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 403 })),
    });
    await store.load(ITEM_ID);
    await expect(store.create(ITEM_ID, { rating: 4 })).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(store.mine()).toEqual([entry]);
    expect(version()).toBe(0);
  });

  it('replaces an edited entry in place and tells discover', async () => {
    const updated = { ...entry, visibility: 'public' as const };
    const { store, version } = setup({
      forItem: vi.fn().mockResolvedValue({ ...sheet, mine: [entry, older] }),
      update: vi.fn().mockResolvedValue(updated),
    });
    await store.load(ITEM_ID);
    await store.update(entry.id, { visibility: 'public' });
    expect(store.mine()).toEqual([updated, older]);
    expect(version()).toBe(1);
  });

  it('keeps the default for new entries when an old one changes visibility', async () => {
    const { store, remember } = setup({
      forItem: vi.fn().mockResolvedValue(sheet),
      update: vi.fn().mockResolvedValue({ ...entry, visibility: 'public' }),
    });
    await store.load(ITEM_ID);
    await store.update(entry.id, { visibility: 'public' });
    expect(remember).not.toHaveBeenCalled();
  });

  it('keeps the entry as it was when an edit fails', async () => {
    const { store, version } = setup({
      forItem: vi.fn().mockResolvedValue(sheet),
      update: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 403 })),
    });
    await store.load(ITEM_ID);
    await expect(store.update(entry.id, { rating: 2 })).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(store.mine()).toEqual([entry]);
    expect(version()).toBe(0);
  });

  it('keeps the entry when deleting fails', async () => {
    const { store, version } = setup({
      forItem: vi.fn().mockResolvedValue(sheet),
      remove: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 500 })),
    });
    await store.load(ITEM_ID);
    await expect(store.remove(entry.id)).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(store.mine()).toEqual([entry]);
    expect(version()).toBe(0);
  });

  it('drops a deleted entry and tells discover', async () => {
    const { store, version } = setup({
      forItem: vi.fn().mockResolvedValue({ ...sheet, mine: [entry, older] }),
      remove: vi.fn().mockResolvedValue(undefined),
    });
    await store.load(ITEM_ID);
    await store.remove(entry.id);
    expect(store.mine()).toEqual([older]);
    expect(version()).toBe(1);
  });

  it('hides someone else’s entry: it leaves the sheet and discover hears of it', async () => {
    const setHidden = vi.fn().mockResolvedValue(undefined);
    const { store, version } = setup({ forItem: vi.fn().mockResolvedValue(sheet), setHidden });
    await store.load(ITEM_ID);
    await store.hide(publicEntry.id);
    expect(setHidden).toHaveBeenCalledWith(publicEntry.id, true);
    expect(store.others()).toEqual([]);
    expect(version()).toBe(1);
  });

  it('keeps the entry when hiding is refused', async () => {
    const { store, version } = setup({
      forItem: vi.fn().mockResolvedValue(sheet),
      setHidden: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 403 })),
    });
    await store.load(ITEM_ID);
    await expect(store.hide(publicEntry.id)).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(store.others()).toEqual([publicEntry]);
    expect(version()).toBe(0);
  });
});
