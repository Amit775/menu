import { TestBed } from '@angular/core/testing';
import { type MenuSection } from '@menu/shared/contracts';
import { classic, drinks, lamb, loadedStore, mains, menuApi } from '../testing/manage-fixtures';
import { MenuEditor } from './menu-editor';

describe('MenuEditor', () => {
  async function render(overrides: Parameters<typeof menuApi>[0] = {}): Promise<HTMLElement> {
    await loadedStore(menuApi(overrides));
    const fixture = TestBed.createComponent(MenuEditor);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  function sections(element: HTMLElement): HTMLElement[] {
    return [...element.querySelectorAll<HTMLElement>('section.section')];
  }

  function type(input: HTMLInputElement | null | undefined, value: string): void {
    if (!input) {
      throw new Error('No input');
    }
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  it('lists sections in menu order with their approved items only', async () => {
    const element = await render();
    expect(sections(element).map((section) => section.querySelector('h3')?.textContent)).toEqual([
      'עיקריות',
      'שתייה',
    ]);
    const [first, second] = sections(element);
    const names = [...(first?.querySelectorAll('.name') ?? [])].map((name) => name.textContent);
    expect(names).toEqual(['קלאסי']);
    expect(first?.querySelector('.facts')?.textContent).toBe('₪62 · המבורגר');
    expect(first?.querySelector('a[href$="/items/' + classic.id + '"]')).not.toBeNull();
    expect(first?.querySelector('a.add-item')?.getAttribute('href')).toBe(
      `/items/new?sectionId=${mains.id}`,
    );
    expect(second?.querySelector('.empty')?.textContent).toBe('אין פריטים בקטע הזה.');
    expect(element.textContent).not.toContain(lamb.name.he);
  });

  it('moves a section down by swapping it with the next one', async () => {
    const reorderSections = vi.fn().mockResolvedValue([
      { ...drinks, position: 0 },
      { ...mains, position: 1 },
    ] satisfies MenuSection[]);
    const element = await render({ reorderSections });
    const [first] = sections(element);
    expect(first?.querySelector<HTMLButtonElement>('.up')?.disabled).toBe(true);
    first?.querySelector<HTMLButtonElement>('.down')?.click();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(sections(element)[0]?.querySelector('h3')?.textContent).toBe('שתייה');
    });
    expect(reorderSections).toHaveBeenCalledWith(mains.venueId, [drinks.id, mains.id]);
  });

  it('renames a section in Hebrew and keeps its English name', async () => {
    const renameSection = vi
      .fn()
      .mockResolvedValue({ ...mains, name: { he: 'מנות', en: 'Mains' } });
    const element = await render({ renameSection });
    sections(element)[0]?.querySelector<HTMLButtonElement>('.rename-start')?.click();
    TestBed.tick();
    type(element.querySelector<HTMLInputElement>('form.rename input'), 'מנות');
    element.querySelector('form.rename')?.dispatchEvent(new Event('submit'));
    await vi.waitFor(() => {
      TestBed.tick();
      expect(sections(element)[0]?.querySelector('h3')?.textContent).toBe('מנות');
    });
    expect(renameSection).toHaveBeenCalledWith(mains.venueId, mains.id, {
      name: { he: 'מנות', en: 'Mains' },
    });
  });

  it('adds a section, and needs a name for it', async () => {
    const addSection = vi.fn().mockResolvedValue({
      ...drinks,
      id: '8c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
      name: { he: 'קינוחים', en: null },
      position: 2,
    });
    const element = await render({ addSection });
    const form = element.querySelector('form.new-section');
    form?.dispatchEvent(new Event('submit'));
    expect(addSection).not.toHaveBeenCalled();
    type(form?.querySelector('input'), ' קינוחים ');
    form?.dispatchEvent(new Event('submit'));
    await vi.waitFor(() => {
      TestBed.tick();
      expect(sections(element)).toHaveLength(3);
    });
    expect(addSection).toHaveBeenCalledWith(mains.venueId, { name: { he: 'קינוחים', en: null } });
  });

  it('takes an item off the menu on the second tap', async () => {
    const decide = vi.fn().mockResolvedValue({ ...classic, state: 'archived' });
    const element = await render({ decide });
    element.querySelector<HTMLButtonElement>('.archive')?.click();
    TestBed.tick();
    expect(decide).not.toHaveBeenCalled();
    expect(element.querySelector('.archive')?.textContent.trim()).toBe('להוציא?');
    element.querySelector<HTMLButtonElement>('.archive')?.click();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('.name')).toBeNull();
    });
    expect(decide).toHaveBeenCalledWith(classic.id, 'archive');
  });

  it('says so when a change is not saved', async () => {
    const element = await render({ reorderSections: vi.fn().mockRejectedValue(new Error('500')) });
    sections(element)[0]?.querySelector<HTMLButtonElement>('.down')?.click();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('[role="alert"]')?.textContent).toBe('השינוי לא נשמר. נסו שוב.');
    });
  });
});
