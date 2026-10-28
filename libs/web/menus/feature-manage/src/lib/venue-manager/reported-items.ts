import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { type Item, type Price } from '@menu/shared/contracts';
import { VenueManagerStore } from '@menu/web/menus/data-access';
import {
  injectTranslate,
  LocalizePipe,
  PricePipe,
  RelativeDatePipe,
} from '@menu/web/shared/util-i18n';
import { venueManagerI18n } from '../venue-manager.i18n';

@Component({
  selector: 'menu-reported-items',
  imports: [RouterLink, MatButtonModule, LocalizePipe, PricePipe, RelativeDatePipe],
  templateUrl: './reported-items.html',
  styleUrl: './reported-items.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportedItems {
  protected readonly store = inject(VenueManagerStore);
  protected readonly t = injectTranslate(venueManagerI18n);

  protected readonly busy = signal<string | null>(null);
  protected readonly failed = signal<string | null>(null);
  protected readonly confirmingArchive = signal<string | null>(null);

  protected confirm(item: Item): Promise<void> {
    return this.run(item, () => this.store.confirmItem(item.id));
  }

  protected setPrice(item: Item, price: Price): Promise<void> {
    return this.run(item, async () => {
      await this.store.updateItem(item.id, { listPrice: price });
    });
  }

  protected archive(item: Item): Promise<void> {
    if (this.confirmingArchive() !== item.id) {
      this.confirmingArchive.set(item.id);
      return Promise.resolve();
    }
    return this.run(item, () => this.store.decide(item.id, 'archive'));
  }

  private async run(item: Item, action: () => Promise<void>): Promise<void> {
    this.busy.set(item.id);
    this.failed.set(null);
    this.confirmingArchive.set(null);
    try {
      await action();
    } catch {
      this.failed.set(item.id);
    } finally {
      this.busy.set(null);
    }
  }
}
