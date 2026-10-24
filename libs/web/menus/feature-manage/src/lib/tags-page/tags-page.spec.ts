import { HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type Tag } from '@menu/shared/contracts';
import { MenuApiClient } from '@menu/web/menus/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { burgerTag } from '../testing/manage-fixtures';
import { TagsPage } from './tags-page';

const vegan: Tag = {
  id: '4a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  slug: 'vegan',
  name: { he: 'טבעוני', en: 'Vegan' },
  kind: 'diet',
};
const burger: Tag = {
  id: '5a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  slug: 'burger',
  name: { he: 'בורגר' },
  kind: 'dish',
};

describe('TagsPage', () => {
  async function render(api: Partial<MenuApiClient>): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: MenuApiClient, useValue: api }],
    });
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(TagsPage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const tags = (): Promise<Tag[]> => Promise.resolve([vegan, burgerTag, burger]);

  function type(root: Element | null, name: string, value: string): void {
    const input = root?.querySelector<HTMLInputElement>(`[formcontrolname="${name}"]`);
    if (!input) {
      throw new Error(`No ${name}`);
    }
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function pick(root: Element | null, label: string): void {
    root?.querySelector<HTMLElement>('.mat-mdc-select-trigger')?.click();
    TestBed.tick();
    [...TestBed.inject(DOCUMENT).querySelectorAll<HTMLElement>('mat-option')]
      .find((option) => option.textContent.trim() === label)
      ?.click();
    TestBed.tick();
  }

  it('groups tags by kind, sorted by slug', async () => {
    const element = await render({ tags });
    const groups = [...element.querySelectorAll('section')].map((section) => ({
      kind: section.querySelector('h2')?.textContent,
      slugs: [...section.querySelectorAll('.slug')].map((slug) => slug.textContent),
    }));
    expect(groups).toEqual([
      { kind: 'מנה', slugs: ['burger', 'hamburger'] },
      { kind: 'תזונה', slugs: ['vegan'] },
    ]);
  });

  it('adds a tag, and says so when its slug is taken', async () => {
    const created: Tag = {
      ...vegan,
      id: '6a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
      slug: 'spicy',
      name: { he: 'חריף' },
      kind: 'flavour',
    };
    const addTag = vi
      .fn()
      .mockRejectedValueOnce(new HttpErrorResponse({ status: 409 }))
      .mockResolvedValue(created);
    const element = await render({ tags, addTag });
    const form = element.querySelector('form.add');
    type(form, 'slug', 'spicy');
    type(form, 'nameHe', ' חריף ');
    pick(form, 'טעם');
    form?.dispatchEvent(new Event('submit'));
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('[role="alert"]')?.textContent).toBe(
        'כבר יש תגית עם המזהה הזה.',
      );
    });
    form?.dispatchEvent(new Event('submit'));
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('[data-slug="spicy"]')).not.toBeNull();
    });
    expect(addTag).toHaveBeenLastCalledWith({
      slug: 'spicy',
      name: { he: 'חריף' },
      kind: 'flavour',
    });
  });

  it('rejects a slug the API would refuse', async () => {
    const addTag = vi.fn();
    const element = await render({ tags, addTag });
    const form = element.querySelector('form.add');
    type(form, 'slug', 'Spicy Food');
    type(form, 'nameHe', 'חריף');
    form?.dispatchEvent(new Event('submit'));
    TestBed.tick();
    expect(addTag).not.toHaveBeenCalled();
    expect(form?.querySelector('mat-error')?.textContent.trim()).toBe(
      'אותיות אנגליות קטנות, ספרות ומקפים, 2 עד 41 תווים.',
    );
  });

  it('renames a tag', async () => {
    const updateTag = vi
      .fn()
      .mockResolvedValue({ ...vegan, name: { he: 'טבעוני לגמרי', en: 'Vegan' } });
    const element = await render({ tags, updateTag });
    const row = element.querySelector('[data-slug="vegan"]');
    row?.querySelector<HTMLButtonElement>('.edit-start')?.click();
    TestBed.tick();
    type(row, 'nameHe', 'טבעוני לגמרי');
    row?.querySelector('form')?.dispatchEvent(new Event('submit'));
    await vi.waitFor(() => {
      TestBed.tick();
      expect(row?.querySelector('.name')?.textContent).toBe('טבעוני לגמרי');
    });
    expect(updateTag).toHaveBeenCalledWith(vegan.id, {
      name: { he: 'טבעוני לגמרי', en: 'Vegan' },
      kind: 'diet',
    });
  });

  it('merges a duplicate into another tag, which removes it', async () => {
    const mergeTag = vi.fn().mockResolvedValue(undefined);
    const element = await render({ tags, mergeTag });
    const row = element.querySelector('[data-slug="burger"]');
    row?.querySelector<HTMLButtonElement>('.merge-start')?.click();
    TestBed.tick();
    expect(row?.querySelector('.hint')?.textContent).toContain('בורגר');
    pick(row, 'המבורגר');
    row?.querySelector<HTMLButtonElement>('.confirm-merge')?.click();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('[data-slug="burger"]')).toBeNull();
    });
    expect(mergeTag).toHaveBeenCalledWith(burger.id, burgerTag.id);
  });

  it('offers to try again when the tags fail to load', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([vegan]);
    const element = await render({ tags: load });
    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('[data-slug="vegan"]')).not.toBeNull();
    });
  });
});
