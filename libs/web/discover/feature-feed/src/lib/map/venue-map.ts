import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  effect,
  inject,
  signal,
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

/** Where the map opens when the user did not share their location. */
export const TEL_AVIV: GeoPoint = { lat: 32.0853, lng: 34.7818 };

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/**
 * The map view: one pin per venue, labelled with its best score (ADR 0008).
 * Tapping a pin opens a card that links to the venue.
 */
@Component({
  selector: 'menu-venue-map',
  imports: [RouterLink, MatButtonModule, MatIconModule, LocalizePipe],
  templateUrl: './venue-map.html',
  styleUrl: './venue-map.scss',
  // Pins are drawn by Leaflet outside this component's view, so its styles are global (scoped by selector).
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueMap {
  protected readonly store = inject(FeedStore);
  private readonly loader = inject(LeafletLoader);
  private readonly i18n = inject(I18n);
  protected readonly t = injectMessages(feedMessages);

  private readonly container = viewChild.required<ElementRef<HTMLElement>>('map');
  protected readonly selected = signal<MapPin | null>(null);

  private leaflet: typeof Leaflet | undefined;
  private map: Leaflet.Map | undefined;
  private pins: Leaflet.LayerGroup | undefined;

  constructor() {
    afterNextRender(() => void this.init());
    effect(() => {
      this.draw(this.store.pins());
    });
    inject(DestroyRef).onDestroy(() => this.map?.remove());
  }

  private async init(): Promise<void> {
    const L = await this.loader.load();
    const near = this.store.near();
    this.leaflet = L;
    this.map = L.map(this.container().nativeElement).setView(near ?? TEL_AVIV, near ? 14 : 12);
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(this.map);
    if (near) {
      L.circleMarker(near, { radius: 7, className: 'menu-map-me' })
        .bindTooltip(this.t().youAreHere)
        .addTo(this.map);
    }
    this.pins = L.layerGroup().addTo(this.map);
    this.draw(this.store.pins());
  }

  private draw(pins: readonly MapPin[]): void {
    const { leaflet: L, map, pins: layer } = this;
    if (!L || !map || !layer) {
      return;
    }
    layer.clearLayers();
    for (const pin of pins) {
      const icon = L.divIcon({
        className: pin.writtenByMe ? 'menu-map-pin mine' : 'menu-map-pin',
        html: pin.bestScore === null ? '•' : pin.bestScore.toFixed(1),
        iconSize: [44, 30],
        iconAnchor: [22, 30],
      });
      const name = this.i18n.pick(pin.venue.name);
      L.marker(pin.location, { icon, title: name, alt: name, keyboard: true })
        .on('click', () => {
          this.selected.set(pin);
        })
        .addTo(layer);
    }
    if (!this.store.near() && pins.length > 0) {
      map.fitBounds(L.latLngBounds(pins.map((pin) => pin.location)), {
        padding: [40, 40],
        maxZoom: 15,
      });
    }
  }
}
