import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { VenuePageStore } from '@menu/web/discover/data-access';
import { ItemRow } from '@menu/web/discover/ui';
import { DistancePipe, injectMessages, LocalizePipe } from '@menu/web/shared/util-i18n';
import { venueMessages } from '../venue.messages';

/** A venue's page: how to get there, what is good, and the whole menu by section. */
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
  protected readonly t = injectMessages(venueMessages);

  /** The `:id` route parameter. */
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
    effect(() => {
      const id = this.id();
      untracked(() => void this.store.load(id));
    });
  }

  protected back(): void {
    this.location.back();
  }

  protected retry(): void {
    void this.store.load(this.id());
  }
}
