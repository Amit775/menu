import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BrowserStorage } from './browser-storage';

describe('BrowserStorage', () => {
  it('reads back what it stored', () => {
    const storage = TestBed.inject(BrowserStorage);
    storage.set('menu.test', 'he');
    expect(storage.get('menu.test')).toBe('he');
  });

  it('returns null when storage is unavailable', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { defaultView: null } }],
    });
    const storage = TestBed.inject(BrowserStorage);
    storage.set('menu.test', 'en');
    expect(storage.get('menu.test')).toBeNull();
  });
});
