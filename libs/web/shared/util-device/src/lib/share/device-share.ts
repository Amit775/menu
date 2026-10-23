import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

/**
 * Shares a link to an app page: the system share sheet where there is one
 * (phones), otherwise the clipboard.
 */
@Injectable({ providedIn: 'root' })
export class DeviceShare {
  private readonly document = inject(DOCUMENT);

  async share(path: string, title: string): Promise<ShareOutcome> {
    const url = new URL(path, this.document.baseURI).href;
    const navigator = this.document.defaultView?.navigator;
    try {
      if (navigator && typeof navigator.share === 'function') {
        await navigator.share({ title, url });
        return 'shared';
      }
      if (navigator?.clipboard) {
        await navigator.clipboard.writeText(url);
        return 'copied';
      }
      return 'failed';
    } catch (error) {
      return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed';
    }
  }
}
