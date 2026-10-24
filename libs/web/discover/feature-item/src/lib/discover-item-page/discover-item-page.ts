import { Location, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { ItemPageStore } from '@menu/web/discover/data-access';
import { DeviceShare } from '@menu/web/shared/util-device';
import { ItemRow, PriceHistory, ScoreBadge } from '@menu/web/discover/ui';
import { I18n, injectTranslate, LocalizePipe, ShekelsPipe } from '@menu/web/shared/util-i18n';
import { itemI18n } from '../item.i18n';

/** An item's page: score and numbers, price history, and what else is good at the venue. */
@Component({
  selector: 'menu-discover-item-page',
  imports: [
    NgOptimizedImage,
    RouterLink,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ItemRow,
    PriceHistory,
    ScoreBadge,
    LocalizePipe,
    ShekelsPipe,
  ],
  templateUrl: './discover-item-page.html',
  styleUrl: './discover-item-page.scss',
  providers: [ItemPageStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoverItemPage {
  protected readonly store = inject(ItemPageStore);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly shareLink = inject(DeviceShare);
  private readonly i18n = inject(I18n);
  protected readonly t = injectTranslate(itemI18n);

  /** The `:id` route parameter. */
  readonly id = input.required<string>();
  protected readonly copied = signal(false);

  constructor() {
    this.store.load(this.id);
  }

  /** The back arrow points where the user came from: right in Hebrew, left in English. */
  protected readonly backIcon = computed(() =>
    this.i18n.dir() === 'rtl' ? 'arrow_forward' : 'arrow_back',
  );

  /** Back in the app, or to discover when the page was opened from a shared link. */
  protected back(): void {
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
    } else {
      void this.router.navigateByUrl('/');
    }
  }

  protected retry(): void {
    this.store.reload();
  }

  protected async share(): Promise<void> {
    const page = this.store.page();
    if (page) {
      const outcome = await this.shareLink.share(
        `/items/${page.item.id}`,
        this.i18n.pick(page.item.name),
      );
      this.copied.set(outcome === 'copied');
    }
  }
}
