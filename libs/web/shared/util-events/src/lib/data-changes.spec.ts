import { TestBed } from '@angular/core/testing';
import { DataChanges } from './data-changes';

describe('DataChanges', () => {
  it('tells every listener of a topic about each change', () => {
    const changes = TestBed.inject(DataChanges);
    const first = vi.fn();
    const second = vi.fn();
    changes.on('entries').subscribe(first);
    changes.on('entries').subscribe(second);
    changes.notify('entries');
    changes.notify('entries');
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(2);
  });

  it('does not replay changes made before a listener joined', () => {
    const changes = TestBed.inject(DataChanges);
    changes.notify('entries');
    const late = vi.fn();
    changes.on('entries').subscribe(late);
    expect(late).not.toHaveBeenCalled();
  });
});
