import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  type ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { type MapPin } from '@menu/shared/contracts';
import { FeedStore } from '@menu/web/discover/data-access';
import { injectTranslate, LocalizePipe } from '@menu/web/shared/util-i18n';
import { LeafletLoader, OSM_ATTRIBUTION, OSM_TILES, TEL_AVIV } from '@menu/web/shared/util-map';
import type * as Leaflet from 'leaflet';
import { feedI18n } from '../feed.i18n';
import { MapPins } from './map-pins';

/**
 * The map view: one pin per venue, labelled with its best score (ADR 0008).
 * A pin opens a card that links to the venue, by tap or by Enter/Space.
 */
@Component({
  selector: 'menu-venue-map',
  imports: [RouterLink, MatButtonModule, MatIconModule, LocalizePipe, MapPins],
  templateUrl: './venue-map.html',
  styleUrl: './venue-map.scss',
  // Pins are drawn by Leaflet outside this component's view, so its styles are global (scoped by selector).
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(keydown.escape)': 'close()' },
})
export class VenueMap {
  protected readonly store = inject(FeedStore);
  private readonly loader = inject(LeafletLoader);
  private readonly injector = inject(Injector);
  protected readonly t = injectTranslate(feedI18n);

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  private readonly pins = viewChild(MapPins);
  protected readonly view = signal<{ leaflet: typeof Leaflet; map: Leaflet.Map } | null>(null);
  private readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(
    () => this.store.pins().find((pin) => pin.venue.id === this.selectedId()) ?? null,
  );

  private destroyed = false;
  private resize: ResizeObserver | undefined;

  constructor() {
    afterNextRender(() => void this.init());
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.resize?.disconnect();
      this.view()?.map.remove();
    });
  }

  protected open(pin: MapPin): void {
    this.selectedId.set(pin.venue.id);
    afterNextRender(() => this.heading()?.nativeElement.focus(), { injector: this.injector });
  }

  protected close(): void {
    const id = this.selectedId();
    if (id) {
      this.selectedId.set(null);
      this.pins()?.focus(id);
    }
  }

  private async init(): Promise<void> {
    const L = await this.loader.load();
    if (this.destroyed) {
      return;
    }
    const element = this.container().nativeElement;
    const map = L.map(element).setView(TEL_AVIV, 12);
    L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(map);
    if (typeof ResizeObserver === 'function') {
      // Leaflet only follows window resizes; the bars above the map come and go.
      this.resize = new ResizeObserver(() => map.invalidateSize());
      this.resize.observe(element);
    }
    this.view.set({ leaflet: L, map });
  }
}
