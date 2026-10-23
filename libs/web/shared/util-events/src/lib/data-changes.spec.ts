import { TestBed } from '@angular/core/testing';
import { DataChanges } from './data-changes';

describe('DataChanges', () => {
  it('counts each change to a topic', () => {
    const changes = TestBed.inject(DataChanges);
    const entries = changes.version('entries');
    expect(entries()).toBe(0);
    changes.notify('entries');
    changes.notify('entries');
    expect(entries()).toBe(2);
  });

  it('gives every reader the same version', () => {
    const changes = TestBed.inject(DataChanges);
    changes.notify('entries');
    expect(changes.version('entries')()).toBe(1);
  });

  it('lets readers watch without changing the version', () => {
    const changes = TestBed.inject(DataChanges);
    expect(() => {
      (changes.version('entries') as unknown as { set(value: number): void }).set(5);
    }).toThrow();
  });
});
