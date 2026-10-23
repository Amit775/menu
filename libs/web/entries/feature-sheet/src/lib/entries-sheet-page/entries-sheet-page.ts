import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { type Entry } from '@menu/shared/contracts';
import { ItemEntriesStore } from '@menu/web/entries/data-access';
import { EntryCard } from '@menu/web/entries/ui';
import { DeviceShare } from '@menu/web/shared/util-device';
import { I18n, injectMessages, LocalizePipe } from '@menu/web/shared/util-i18n';
import { sheetMessages } from '../sheet.messages';

type Notice = 'copied' | 'share-failed' | 'update-failed';

/**
 * What people wrote about an item (`/items/:id/entries`): the user's own
 * entries on top, marked private or public, then public ones newest first.
 */
@Component({
  selector: 'menu-entries-sheet-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EntryCard,
    LocalizePipe,
  ],
  templateUrl: './entries-sheet-page.html',
  styleUrl: './entries-sheet-page.scss',
  providers: [ItemEntriesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntriesSheetPage {
  protected readonly store = inject(ItemEntriesStore);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly deviceShare = inject(DeviceShare);
  private readonly i18n = inject(I18n);
  protected readonly t = injectMessages(sheetMessages);

  /** The item's `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly notice = signal<Notice | null>(null);
  protected readonly busy = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.store.load(id));
    });
  }

  protected close(): void {
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
    } else {
      void this.router.navigate(['/items', this.id()]);
    }
  }

  protected retry(): void {
    void this.store.load(this.id());
  }

  protected async makePublic(entry: Entry): Promise<void> {
    this.busy.set(entry.id);
    this.notice.set(null);
    try {
      await this.store.update(entry.id, { visibility: 'public' });
    } catch {
      this.notice.set('update-failed');
    } finally {
      this.busy.set(null);
    }
  }

  protected async share(entry: Entry): Promise<void> {
    const sheet = this.store.sheet();
    if (!entry.shareToken || !sheet) {
      return;
    }
    const outcome = await this.deviceShare.share(
      `/e/${entry.shareToken}`,
      this.i18n.pick(sheet.item.name),
    );
    this.notice.set(outcome === 'copied' ? 'copied' : outcome === 'failed' ? 'share-failed' : null);
  }
}
