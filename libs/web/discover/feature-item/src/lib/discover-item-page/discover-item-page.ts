import { Location, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { ItemPageStore } from '@menu/web/discover/data-access';
import { DeviceShare } from '@menu/web/shared/util-device';
import { ItemRow, PriceHistory, ScoreBadge } from '@menu/web/discover/ui';
import { I18n, injectMessages, LocalizePipe, ShekelsPipe } from '@menu/web/shared/util-i18n';
import { itemMessages } from '../item.messages';

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
  protected readonly t = injectMessages(itemMessages);

  /** The `:id` route parameter. */
  readonly id = input.required<string>();
  protected readonly copied = signal(false);

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.store.load(id));
    });
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
    void this.store.load(this.id());
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
