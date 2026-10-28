import { TestBed } from '@angular/core/testing';
import { AUTH_BACKEND, FakeAuthBackend } from '@menu/web/shared/util-auth';
import { DataChanges } from '@menu/web/shared/util-events';
import { DiscoverApiClient } from '../api/discover.api-client';
import { SavedItems } from './saved-items';

describe('SavedItems', () => {
  const item = { id: 'i1', savedByMe: false };

  function setup(api: Partial<DiscoverApiClient>, backend = new FakeAuthBackend()): SavedItems {
    TestBed.configureTestingModule({
      providers: [
        { provide: DiscoverApiClient, useValue: api },
        { provide: AUTH_BACKEND, useValue: backend },
      ],
    });
    return TestBed.inject(SavedItems);
  }

  it('takes what the server said until the caller changes it', () => {
    const saved = setup({});
    expect(saved.isSaved(item)).toBe(false);
    expect(saved.isSaved({ ...item, savedByMe: true })).toBe(true);
  });

  it('saves at once and remembers it for every page', async () => {
    const save = vi.fn().mockResolvedValue({});
    const saved = setup({ save });
    const done = saved.toggle(item);
    expect(saved.isSaved(item)).toBe(true);
    await done;
    expect(save).toHaveBeenCalledWith('i1');
    expect(saved.isSaved(item)).toBe(true);
  });

  it('removes a saved item', async () => {
    const unsave = vi.fn().mockResolvedValue(undefined);
    const saved = setup({ unsave });
    await saved.toggle({ ...item, savedByMe: true });
    expect(unsave).toHaveBeenCalledWith('i1');
    expect(saved.isSaved({ ...item, savedByMe: true })).toBe(false);
  });

  it('puts it back when the API refuses', async () => {
    const saved = setup({ save: vi.fn().mockRejectedValue(new Error('offline')) });
    await expect(saved.toggle(item)).rejects.toThrow('offline');
    expect(saved.isSaved(item)).toBe(false);
  });

  it('forgets what one person saved when someone else signs in', async () => {
    const backend = new FakeAuthBackend({ uid: 'a', displayName: null, phoneNumber: null });
    const saved = setup({ save: vi.fn().mockResolvedValue({}) }, backend);
    await saved.toggle(item);
    expect(saved.isSaved(item)).toBe(true);
    await backend.signOut();
    expect(saved.isSaved(item)).toBe(false);
  });

  it('follows the log form taking an item off the list', async () => {
    const saved = setup({ save: vi.fn().mockResolvedValue({}), unsave: vi.fn() });
    await saved.toggle(item);
    TestBed.inject(DataChanges).notify('saved', { itemId: 'i1', saved: false });
    expect(saved.isSaved(item)).toBe(false);
  });

  it('ignores a second tap while the first is on its way', async () => {
    let finish: () => void = () => undefined;
    const save = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const unsave = vi.fn();
    const saved = setup({ save: save as unknown as DiscoverApiClient['save'], unsave });
    const first = saved.toggle(item);
    await saved.toggle(item);
    finish();
    await first;
    expect(unsave).not.toHaveBeenCalled();
    expect(saved.isSaved(item)).toBe(true);
  });
});
