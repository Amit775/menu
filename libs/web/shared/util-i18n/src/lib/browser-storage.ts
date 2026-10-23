import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

/**
 * Per-device preferences (language, last visibility). Reaches localStorage through
 * DOCUMENT so it stays safe on the server and in Capacitor, and never throws:
 * private windows and blocked storage simply remember nothing.
 */
@Injectable({ providedIn: 'root' })
export class BrowserStorage {
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage ?? null;

  get(key: string): string | null {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  set(key: string, value: string): void {
    try {
      this.storage?.setItem(key, value);
    } catch {
      // Storage is a convenience; ignore quota and privacy errors.
    }
  }
}
