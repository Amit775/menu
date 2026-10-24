import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { VenuePageStore } from '@menu/web/discover/data-access';
import { ItemRow } from '@menu/web/discover/ui';
import { DistancePipe, I18n, injectTranslate, LocalizePipe } from '@menu/web/shared/util-i18n';
import { venueI18n } from '../venue.i18n';

@Component({
  selector: 'menu-discover-venue-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ItemRow,
    DistancePipe,
    LocalizePipe,
  ],
  templateUrl: './discover-venue-page.html',
  styleUrl: './discover-venue-page.scss',
  providers: [VenuePageStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoverVenuePage {
  protected readonly store = inject(VenuePageStore);
  private readonly location = inject(Location);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);
  protected readonly t = injectTranslate(venueI18n);

  readonly id = input.required<string>();

  /** Waze opens the route on phones (and its web map elsewhere); it is what Israel drives with. */
  protected readonly navigateUrl = computed(() => {
    const venue = this.store.page()?.venue;
    return venue
      ? `https://waze.com/ul?ll=${String(venue.location.lat)},${String(venue.location.lng)}&navigate=yes`
      : null;
  });
  protected readonly phoneUrl = computed(() => {
    const phone = this.store.page()?.venue.phone;
    return phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : null;
  });
  protected readonly hasMenu = computed(() =>
    (this.store.page()?.sections ?? []).some((section) => section.items.length > 0),
  );

  constructor() {
    this.store.load(this.id);
  }

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
}
