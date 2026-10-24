import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ManagedVenuesStore } from '@menu/web/menus/data-access';
import { Roles } from '@menu/web/shared/util-auth';
import { I18n, injectMessages, LocalizePipe } from '@menu/web/shared/util-i18n';
import { venuesMessages } from '../venues.messages';

/**
 * J6/J7: "my venues" (`/manage`). An Owner's venues, or every venue for an
 * Admin, those with items waiting for approval first. Admins also reach new
 * venues, the tag vocabulary and people from here.
 */
@Component({
  selector: 'menu-menus-manage-page',
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressSpinnerModule, LocalizePipe],
  templateUrl: './menus-manage-page.html',
  styleUrl: './menus-manage-page.scss',
  providers: [ManagedVenuesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenusManagePage {
  protected readonly store = inject(ManagedVenuesStore);
  protected readonly roles = inject(Roles);
  private readonly i18n = inject(I18n);
  protected readonly t = injectMessages(venuesMessages);
  protected readonly openIcon = computed(() =>
    this.i18n.dir() === 'rtl' ? 'chevron_left' : 'chevron_right',
  );

  protected retry(): void {
    this.store.reload();
  }
}
