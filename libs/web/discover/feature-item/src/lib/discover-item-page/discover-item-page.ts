import { Location, NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { ItemPageStore, SavedItems } from '@menu/web/discover/data-access';
import { Auth, Roles } from '@menu/web/shared/util-auth';
import { DeviceShare } from '@menu/web/shared/util-device';
import { ItemHistory, ItemRow, ScoreBadge } from '@menu/web/discover/ui';
import {
  I18n,
  injectTranslate,
  LocalizePipe,
  PricePipe,
  RelativeDatePipe,
} from '@menu/web/shared/util-i18n';
import { ItemReportForm } from '../item-report-form/item-report-form';
import { itemI18n } from '../item.i18n';

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
    ItemHistory,
    ScoreBadge,
    ItemReportForm,
    LocalizePipe,
    PricePipe,
    RelativeDatePipe,
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
  private readonly roles = inject(Roles);
  protected readonly auth = inject(Auth);
  private readonly savedItems = inject(SavedItems);
  protected readonly t = injectTranslate(itemI18n);

  readonly id = input.required<string>();
  protected readonly copied = signal(false);
  protected readonly saveFailed = signal(false);
  protected readonly saved = computed(() => {
    const page = this.store.page();
    return page !== null && this.savedItems.isSaved(page.item);
  });

  constructor() {
    this.store.load(this.id);
  }

  protected readonly canEdit = computed(() => {
    const page = this.store.page();
    return page !== null && !page.archived && this.roles.canEditItems(page.item.venue.id);
  });

  protected readonly backIcon = computed(() =>
    this.i18n.dir() === 'rtl' ? 'arrow_forward' : 'arrow_back',
  );

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

  protected async toggleSaved(): Promise<void> {
    const page = this.store.page();
    if (!page) {
      return;
    }
    this.saveFailed.set(false);
    try {
      await this.savedItems.toggle(page.item);
    } catch {
      this.saveFailed.set(true);
    }
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
