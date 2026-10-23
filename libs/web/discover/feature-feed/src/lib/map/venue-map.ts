import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { type GeoPoint, type MapPin } from '@menu/shared/contracts';
import { FeedStore } from '@menu/web/discover/data-access';
import { I18n, injectMessages, LocalizePipe } from '@menu/web/shared/util-i18n';
import type * as Leaflet from 'leaflet';
import { feedMessages } from '../feed.messages';
import { LeafletLoader } from './leaflet-loader';

/** Where the map opens before any pin or position is known. */
export const TEL_AVIV: GeoPoint = { lat: 32.0853, lng: 34.7818 };

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
/** Never zoom in closer than a few streets when fitting the pins. */
const FIT_MAX_ZOOM = 15;

/**
 * The map view: one pin per venue, labelled with its best score (ADR 0008).
 * A pin opens a card that links to the venue, by tap or by Enter/Space.
 */
@Component({
  selector: 'menu-venue-map',
  imports: [RouterLink, MatButtonModule, MatIconModule, LocalizePipe],
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
  private readonly i18n = inject(I18n);
  protected readonly t = injectMessages(feedMessages);

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('map');
  private readonly heading = viewChild<ElementRef<HTMLElement>>('heading');
  protected readonly selected = signal<MapPin | null>(null);

  private leaflet: typeof Leaflet | undefined;
  private map: Leaflet.Map | undefined;
  private pins: Leaflet.LayerGroup | undefined;
  private me: Leaflet.CircleMarker | undefined;
  private markers = new Map<string, HTMLElement>();
  private destroyed = false;
  private resize: ResizeObserver | undefined;

  constructor() {
    afterNextRender(() => void this.init());
    effect(() => {
      const pins = this.store.pins();
      untracked(() => {
        this.draw(pins);
      });
    });
    effect(() => {
      const near = this.store.near();
      untracked(() => {
        this.showMe(near);
      });
    });
    // A venue the new filters leave out loses its card.
    effect(() => {
      const ids = new Set(this.store.pins().map((pin) => pin.venue.id));
      untracked(() => {
        const selected = this.selected();
        if (selected && !ids.has(selected.venue.id)) {
          this.selected.set(null);
        }
      });
    });
    // Move focus to the card when it opens, so keyboard users land on it.
    effect(() => {
      this.heading()?.nativeElement.focus();
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.resize?.disconnect();
      this.map?.remove();
    });
  }

  protected close(): void {
    const pin = this.selected();
    if (pin) {
      this.selected.set(null);
      this.markers.get(pin.venue.id)?.focus();
    }
  }

  private async init(): Promise<void> {
    const L = await this.loader.load();
    if (this.destroyed) {
      return;
    }
    const element = this.container().nativeElement;
    this.leaflet = L;
    this.map = L.map(element).setView(TEL_AVIV, 12);
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(this.map);
    this.pins = L.layerGroup().addTo(this.map);
    if (typeof ResizeObserver === 'function') {
      // Leaflet only follows window resizes; the bars above the map come and go.
      this.resize = new ResizeObserver(() => this.map?.invalidateSize());
      this.resize.observe(element);
    }
    this.showMe(this.store.near());
    this.draw(this.store.pins());
  }

  private showMe(near: GeoPoint | null): void {
    const { leaflet: L, map } = this;
    if (!L || !map || !near || this.me) {
      return;
    }
    this.me = L.circleMarker(near, { radius: 7, className: 'menu-map-me' })
      .bindTooltip(() => this.t().youAreHere)
      .addTo(map);
    this.fit(this.store.pins());
  }

  private draw(pins: readonly MapPin[]): void {
    const { leaflet: L, pins: layer } = this;
    if (!L || !layer) {
      return;
    }
    layer.clearLayers();
    this.markers.clear();
    for (const pin of pins) {
      const icon = L.divIcon({
        className: pin.writtenByMe ? 'menu-map-pin mine' : 'menu-map-pin',
        html: pin.bestScore === null ? '•' : pin.bestScore.toFixed(1),
        iconSize: [44, 30],
        iconAnchor: [22, 30],
      });
      const open = (): void => {
        this.selected.set(pin);
      };
      const marker = L.marker(pin.location, { icon, keyboard: true })
        .on('click', open)
        .addTo(layer);
      const element = marker.getElement();
      if (element) {
        // A divIcon is named by its content (the score), so name it for screen readers here.
        element.setAttribute('aria-label', this.pinLabel(pin));
        element.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        });
        this.markers.set(pin.venue.id, element);
      }
    }
    this.fit(pins);
  }

  /** Shows every pin, and the user when known, without zooming in past a few streets. */
  private fit(pins: readonly MapPin[]): void {
    const { leaflet: L, map } = this;
    const near = this.store.near();
    const points = [...pins.map((pin) => pin.location), ...(near ? [near] : [])];
    if (!L || !map || points.length === 0) {
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: FIT_MAX_ZOOM });
  }

  private pinLabel(pin: MapPin): string {
    const t = this.t();
    const parts = [this.i18n.pick(pin.venue.name), t.pinSummary(pin.itemCount, pin.bestScore)];
    return (pin.writtenByMe ? [...parts, t.writtenByMe] : parts).join(', ');
  }
}
