import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MenuApiClient } from '../menu/menu.api-client';
import { tag, settle } from '../testing/fixtures';
import { TagsStore } from './tags.store';

describe('TagsStore', () => {
  const burger = { ...tag, id: '2a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10', slug: 'burger' };

  function setup(api: Partial<MenuApiClient>) {
    TestBed.configureTestingModule({
      providers: [
        TagsStore,
        {
          provide: MenuApiClient,
          useValue: { tags: vi.fn().mockResolvedValue([tag, burger]), ...api },
        },
      ],
    });
    return TestBed.inject(TagsStore);
  }

  it('lists the vocabulary by slug', async () => {
    const store = setup({});
    await settle();
    expect(store.sorted().map((t) => t.slug)).toEqual(['burger', 'hamburger']);
  });

  it('records a failed load', async () => {
    const store = setup({ tags: vi.fn().mockRejectedValue(new Error('offline')) });
    await settle();
    expect(store.status()).toBe('error');
  });

  it('adds, renames and merges tags', async () => {
    const fries = { ...tag, id: '1a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10', slug: 'fries' };
    const mergeTag = vi.fn().mockResolvedValue(undefined);
    const store = setup({
      addTag: vi.fn().mockResolvedValue(fries),
      updateTag: vi.fn().mockResolvedValue({ ...burger, name: { he: 'בורגר' } }),
      mergeTag,
    });
    await settle();
    await store.add({ slug: 'fries', name: fries.name, kind: 'dish' });
    await store.update(burger.id, { name: { he: 'בורגר' } });
    await store.merge(burger.id, tag.id);
    expect(mergeTag).toHaveBeenCalledWith(burger.id, tag.id);
    expect(store.sorted().map((t) => t.slug)).toEqual(['fries', 'hamburger']);
  });

  it('keeps the tag when the API refuses', async () => {
    const store = setup({
      addTag: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 409 })),
    });
    await settle();
    await expect(
      store.add({ slug: 'burger', name: burger.name, kind: 'dish' }),
    ).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(store.tags()).toHaveLength(2);
  });
});
