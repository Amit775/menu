import { inject, Service, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type DiscoverItem } from '@menu/shared/contracts';
import { Auth } from '@menu/web/shared/util-auth';
import { DataChanges } from '@menu/web/shared/util-events';
import { DiscoverApiClient } from '../api/discover.api-client';

type Saveable = Pick<DiscoverItem, 'id' | 'savedByMe'>;

/**
 * Whether the caller saved an item to try, across every page that shows it.
 * The server's `savedByMe` holds until the caller changes it here or the log
 * form takes it off the list; a change shows at once and is put back if the
 * API refuses it. Forgotten on sign-in and sign-out, so the next person on
 * the device never sees it.
 */
@Service()
export class SavedItems {
  private readonly api = inject(DiscoverApiClient);
  private readonly changed = signal<ReadonlyMap<string, boolean>>(new Map());
  private readonly pending = new Set<string>();

  constructor() {
    inject(Auth)
      .userChanges.pipe(takeUntilDestroyed())
      .subscribe(() => {
        this.changed.set(new Map());
      });
    inject(DataChanges)
      .on('saved')
      .pipe(takeUntilDestroyed())
      .subscribe(({ itemId, saved }) => {
        this.set(itemId, saved);
      });
  }

  isSaved(item: Saveable): boolean {
    return this.changed().get(item.id) ?? item.savedByMe;
  }

  /** A tap while the last one is still on its way is ignored. */
  async toggle(item: Saveable): Promise<void> {
    if (this.pending.has(item.id)) {
      return;
    }
    const saved = !this.isSaved(item);
    this.pending.add(item.id);
    this.set(item.id, saved);
    try {
      await (saved ? this.api.save(item.id) : this.api.unsave(item.id));
    } catch (error) {
      this.set(item.id, !saved);
      throw error;
    } finally {
      this.pending.delete(item.id);
    }
  }

  private set(id: string, saved: boolean): void {
    this.changed.update((changed) => new Map(changed).set(id, saved));
  }
}
