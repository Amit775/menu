import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  type ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FeedStore, type FeedView } from '@menu/web/discover/data-access';
import { ItemRow } from '@menu/web/discover/ui';
import { I18n, injectMessages } from '@menu/web/shared/util-i18n';
import { feedMessages } from '../feed.messages';
import { FilterSheet } from '../filters/filter-sheet';
import { VenueMap } from '../map/venue-map';
import { ReelCard } from '../reels/reel-card';
import { SearchPanel } from '../search/search-panel';

/** Load the next page when this few cards are left. */
const PREFETCH = 3;

/**
 * The discover home: a full-screen reels feed (swipe sideways for the next item)
 * a ranked list, or a map of venues, with filters and search on top.
 */
@Component({
  selector: 'menu-discover-feed-page',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    ItemRow,
    ReelCard,
    VenueMap,
  ],
  templateUrl: './discover-feed-page.html',
  styleUrl: './discover-feed-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoverFeedPage {
  protected readonly store = inject(FeedStore);
  private readonly i18n = inject(I18n);
  protected readonly t = injectMessages(feedMessages);

  private readonly sheet = inject(MatBottomSheet);
  private readonly dialog = inject(MatDialog);
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');

  /** By score the list splits off items without enough ratings; other orders are one list. */
  protected readonly splitByRanking = computed(() => this.store.filters().sort === 'score');
  /** Items (or the map) are on screen and a newer request is on its way. */
  protected readonly refreshing = computed(
    () =>
      this.store.status() === 'loading' &&
      (this.store.view() === 'map' || this.store.items().length > 0),
  );
  protected readonly pageFailed = computed(
    () => this.store.status() === 'error' && this.store.items().length > 0,
  );
  protected readonly filterLabel = computed(() => {
    const tag = this.store.primaryTag();
    return tag ? `${this.t().filter} · ${this.i18n.pick(tag.name)}` : this.t().filter;
  });

  constructor() {
    void this.store.load().then(() => {
      this.prepareCard(this.store.reelIndex());
    });
    // Back from an item or a venue: show the card the user left.
    afterNextRender(() => {
      const track = this.track()?.nativeElement;
      if (track && this.store.reelIndex() > 0) {
        // Right-to-left scrolling counts scrollLeft down from zero.
        const direction = this.i18n.dir() === 'rtl' ? -1 : 1;
        track.scrollLeft = direction * this.store.reelIndex() * track.clientWidth;
      }
    });
  }

  protected openFilters(): void {
    this.sheet.open(FilterSheet, { ariaLabel: this.t().filters });
  }

  protected openSearch(): void {
    this.dialog.open(SearchPanel, {
      ariaLabel: this.t().search,
      width: '100vw',
      maxWidth: '100vw',
      height: '100dvh',
    });
  }

  protected setView(view: FeedView): void {
    void this.store.setView(view);
  }

  /** Reels: work out which card is showing, prepare its venue strip, and fetch ahead. */
  protected scrolled(element: HTMLElement): void {
    const index = Math.round(Math.abs(element.scrollLeft) / Math.max(element.clientWidth, 1));
    if (index !== this.store.reelIndex()) {
      this.store.setReelIndex(index);
    }
    this.prepareCard(index);
    if (index >= this.store.items().length - PREFETCH && !this.pageFailed()) {
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
