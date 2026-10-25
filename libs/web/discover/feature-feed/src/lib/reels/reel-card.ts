import { NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { type DiscoverItem } from '@menu/shared/contracts';
import { FeedStore } from '@menu/web/discover/data-access';
import { DeviceShare } from '@menu/web/shared/util-device';
import { ScoreBadge } from '@menu/web/discover/ui';
import {
  DistancePipe,
  I18n,
  injectTranslate,
  LocalizePipe,
  PricePipe,
} from '@menu/web/shared/util-i18n';
import { feedI18n } from '../feed.i18n';

const SWIPE = 60;
const COPIED_NOTICE_MS = 3000;

@Component({
  selector: 'menu-reel-card',
  imports: [
    NgOptimizedImage,
    MatIconModule,
    RouterLink,
    ScoreBadge,
    LocalizePipe,
    DistancePipe,
    PricePipe,
  ],
  templateUrl: './reel-card.html',
  styleUrl: './reel-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReelCard {
  private readonly store = inject(FeedStore);
  private readonly router = inject(Router);
  private readonly shareLink = inject(DeviceShare);
  private readonly i18n = inject(I18n);
  protected readonly t = injectTranslate(feedI18n);

  readonly item = input.required<DiscoverItem>();
  readonly lead = input(false);

  private readonly stepped = signal<DiscoverItem | null>(null);
  protected readonly shown = computed(() => this.stepped() ?? this.item());
  protected readonly siblings = computed(() => this.store.venueItems()[this.item().venue.id] ?? []);
  protected readonly position = computed(() =>
    this.siblings().findIndex((sibling) => sibling.id === this.shown().id),
  );
  protected readonly copied = signal(false);

  private start: { x: number; y: number } | null = null;
  /** Set by a swipe up, so the click that follows it does not also step or open a link. */
  private swiped = false;

  protected async step(direction: 1 | -1): Promise<void> {
    await this.store.loadVenueItems(this.item().venue.id);
    const siblings = this.siblings();
    if (siblings.length < 2) {
      return;
    }
    const from = Math.max(0, this.position());
    const next = siblings[(from + direction + siblings.length) % siblings.length];
    this.stepped.set(next ?? null);
  }

  protected pointerDown(event: PointerEvent): void {
    this.start = { x: event.clientX, y: event.clientY };
    this.swiped = false;
  }

  /** The browser took the gesture over (a sideways pan of the feed). */
  protected pointerCancel(): void {
    this.start = null;
  }

  constructor() {
    // Capture phase, so the click that ends a swipe never reaches an edge button or a link.
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement.addEventListener(
      'click',
      (event: MouseEvent) => {
        if (this.swiped) {
          this.swiped = false;
          event.preventDefault();
          event.stopPropagation();
        }
      },
      { capture: true },
    );
  }

  protected pointerUp(event: PointerEvent): void {
    if (!this.start) {
      return;
    }
    const dx = event.clientX - this.start.x;
    const dy = event.clientY - this.start.y;
    this.start = null;
    if (dy < -SWIPE && Math.abs(dx) < SWIPE) {
      this.swiped = true;
      void this.router.navigate(['/venues', this.shown().venue.id]);
    }
  }

  protected async share(): Promise<void> {
    const item = this.shown();
    const outcome = await this.shareLink.share(`/items/${item.id}`, this.i18n.pick(item.name));
    if (outcome === 'copied') {
      this.copied.set(true);
      setTimeout(() => {
        this.copied.set(false);
      }, COPIED_NOTICE_MS);
    }
  }
}
