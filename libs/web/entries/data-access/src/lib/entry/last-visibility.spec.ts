import { TestBed } from '@angular/core/testing';
import { BrowserStorage } from '@menu/web/shared/util-i18n';
import { LastVisibility } from './last-visibility';

describe('LastVisibility', () => {
  function setup(stored: string | null): {
    visibility: LastVisibility;
    set: ReturnType<typeof vi.fn>;
  } {
    const set = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: BrowserStorage, useValue: { get: () => stored, set } }],
    });
    return { visibility: TestBed.inject(LastVisibility), set };
  }

  it('starts private on first use', () => {
    expect(setup(null).visibility.get()).toBe('private');
  });

  it('remembers the last choice', () => {
    const { visibility, set } = setup('public');
    expect(visibility.get()).toBe('public');
    visibility.set('shared');
    expect(set).toHaveBeenCalledWith('menu.entry-visibility', 'shared');
  });

  it('falls back to private when the stored value is not a visibility', () => {
    expect(setup('everyone').visibility.get()).toBe('private');
  });
});
