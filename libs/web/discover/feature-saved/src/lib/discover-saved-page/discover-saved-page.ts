import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { SavedItems, SavedPageStore } from '@menu/web/discover/data-access';
import { ItemRow } from '@menu/web/discover/ui';
import { I18n, injectTranslate } from '@menu/web/shared/util-i18n';
import { discoverSavedI18n } from '../discover-saved.i18n';

@Component({
  selector: 'menu-discover-saved-page',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink, ItemRow],
  templateUrl: './discover-saved-page.html',
  styleUrl: './discover-saved-page.scss',
  providers: [SavedPageStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoverSavedPage {
  protected readonly store = inject(SavedPageStore);
  private readonly savedItems = inject(SavedItems);
  private readonly i18n = inject(I18n);
  protected readonly t = injectTranslate(discoverSavedI18n);

  /** One taken off the list, here or on the log form, leaves it without a reload. */
  protected readonly items = computed(() =>
    this.store.items().filter((item) => this.savedItems.isSaved(item)),
  );
  protected readonly backIcon = computed(() =>
    this.i18n.dir() === 'rtl' ? 'arrow_forward' : 'arrow_back',
  );
}
