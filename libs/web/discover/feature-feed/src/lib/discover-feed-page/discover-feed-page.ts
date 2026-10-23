import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FeedStore, type FeedView } from '@menu/web/discover/data-access';
import { ItemRow } from '@menu/web/discover/ui';
import { I18n, injectMessages } from '@menu/web/shared/util-i18n';
import { feedMessages } from '../feed.messages';
import { FilterSheet } from '../filters/filter-sheet';
import { ReelCard } from '../reels/reel-card';
import { SearchPanel } from '../search/search-panel';

/** Load the next page when this few cards are left. */
const PREFETCH = 3;

/**
 * The discover home: a full-screen reels feed (swipe sideways for the next item)
 * or a ranked list, with filters and search on top. The map view comes next.
 */
@Component({
  selector: 'menu-discover-feed-page',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    FilterSheet,
    ItemRow,
    ReelCard,
    SearchPanel,
  ],
  templateUrl: './discover-feed-page.html',
  styleUrl: './discover-feed-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoverFeedPage {
  protected readonly store = inject(FeedStore);
  private readonly i18n = inject(I18n);
  protected readonly t = injectMessages(feedMessages);

  protected readonly panel = signal<'filters' | 'search' | null>(null);
  protected readonly filterLabel = computed(() => {
    const tag = this.store.primaryTag();
    return tag ? `${this.t().filter} · ${this.i18n.pick(tag.name)}` : this.t().filter;
  });

  constructor() {
    void this.store.load().then(() => {
      this.prepareCard(0);
    });
  }

  protected setView(view: FeedView): void {
    void this.store.setView(view);
  }

  /** Reels: work out which card is showing, prepare its venue strip, and fetch ahead. */
  protected scrolled(element: HTMLElement): void {
    const index = Math.round(Math.abs(element.scrollLeft) / Math.max(element.clientWidth, 1));
    this.prepareCard(index);
    if (index >= this.store.items().length - PREFETCH) {
      void this.store.loadMore();
    }
  }

  private prepareCard(index: number): void {
    const item = this.store.items()[index];
    if (item) {
      void this.store.loadVenueItems(item.venue.id);
    }
  }
}
