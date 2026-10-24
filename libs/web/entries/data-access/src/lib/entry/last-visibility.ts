import { inject, Service } from '@angular/core';
import { type EntryVisibility, EntryVisibilitySchema } from '@menu/shared/contracts';
import { BrowserStorage } from '@menu/web/shared/util-i18n';

const KEY = 'menu.entry-visibility';

/** A new entry starts with the visibility the user chose last time on this device, private on first use. */
@Service()
export class LastVisibility {
  private readonly storage = inject(BrowserStorage);

  get(): EntryVisibility {
    const parsed = EntryVisibilitySchema.safeParse(this.storage.get(KEY));
    return parsed.success ? parsed.data : 'private';
  }

  set(visibility: EntryVisibility): void {
    this.storage.set(KEY, visibility);
  }
}
