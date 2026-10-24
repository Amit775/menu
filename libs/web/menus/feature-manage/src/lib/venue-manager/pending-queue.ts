import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { type Item, type ItemDecision } from '@menu/shared/contracts';
import { VenueManagerStore } from '@menu/web/menus/data-access';
import {
  formatShekels,
  I18n,
  injectMessages,
  LocalizePipe,
  RelativeDatePipe,
} from '@menu/web/shared/util-i18n';
import { venueManagerMessages } from '../venue-manager.messages';

/**
 * J4/J6: items diners added, waiting for the venue's decision. Each shows the
 * item only (name, section, price, tags), never who added it or their entry.
 */
@Component({
  selector: 'menu-pending-queue',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    LocalizePipe,
    RelativeDatePipe,
  ],
  templateUrl: './pending-queue.html',
  styleUrl: './pending-queue.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PendingQueue {
  protected readonly store = inject(VenueManagerStore);
  private readonly i18n = inject(I18n);
  protected readonly t = injectMessages(venueManagerMessages);

  protected readonly busy = signal<string | null>(null);
  protected readonly failed = signal<string | null>(null);
  protected readonly confirmingReject = signal<string | null>(null);
  protected readonly merging = signal<string | null>(null);
  protected readonly mergeTarget = new FormControl<string | null>(null);

  protected readonly rows = computed(() =>
    this.store.pending().map((item) => ({ item, facts: this.facts(item) })),
  );

  protected async decide(item: Item, decision: ItemDecision): Promise<void> {
    if (decision === 'reject' && this.confirmingReject() !== item.id) {
      this.confirmingReject.set(item.id);
      return;
    }
    await this.run(item, () => this.store.decide(item.id, decision));
  }

  protected startMerge(item: Item): void {
    this.confirmingReject.set(null);
    this.mergeTarget.reset(null);
    this.merging.set(item.id);
  }

  protected cancelMerge(): void {
    this.merging.set(null);
  }

  protected async merge(item: Item): Promise<void> {
    const target = this.mergeTarget.value;
    if (target) {
      await this.run(item, () => this.store.merge(item.id, target));
    }
  }

  private async run(item: Item, action: () => Promise<void>): Promise<void> {
    this.busy.set(item.id);
    this.failed.set(null);
    this.confirmingReject.set(null);
    try {
      await action();
      this.merging.set(null);
    } catch {
      this.failed.set(item.id);
    } finally {
      this.busy.set(null);
    }
  }

  private facts(item: Item): string {
    const section = this.store.sectionsById().get(item.sectionId);
    const tags = item.tagIds
      .map((id) => this.store.tagsById().get(id))
      .filter((tag) => tag !== undefined)
      .map((tag) => this.i18n.pick(tag.name))
      .join(', ');
    return this.t().facts(
      section ? this.i18n.pick(section.name) : '',
      item.listPrice === null ? '' : formatShekels(item.listPrice),
      tags,
    );
  }
}
