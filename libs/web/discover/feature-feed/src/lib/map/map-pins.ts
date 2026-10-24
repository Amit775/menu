import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  type OnChanges,
  type OnDestroy,
  output,
} from '@angular/core';
import { type GeoPoint, type MapPin } from '@menu/shared/contracts';
import { I18n, injectMessages } from '@menu/web/shared/util-i18n';
import type * as Leaflet from 'leaflet';
import { feedMessages } from '../feed.messages';

const FIT_MAX_ZOOM = 15;

@Component({
  selector: 'menu-map-pins',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapPins implements OnChanges, OnDestroy {
  readonly leaflet = input.required<typeof Leaflet>();
  readonly map = input.required<Leaflet.Map>();
  readonly pins = input.required<readonly MapPin[]>();
  readonly near = input.required<GeoPoint | null>();
  readonly opened = output<MapPin>();

  private readonly i18n = inject(I18n);
  private readonly t = injectMessages(feedMessages);
  private layer: Leaflet.LayerGroup | undefined;
  private me: Leaflet.CircleMarker | undefined;
  private readonly markers = new Map<string, HTMLElement>();

  ngOnChanges(): void {
    this.showMe();
    this.draw();
    this.fit();
  }

  ngOnDestroy(): void {
    this.layer?.clearLayers();
  }

  focus(venueId: string): void {
    this.markers.get(venueId)?.focus();
  }

  private showMe(): void {
    const near = this.near();
    if (!near || this.me) {
      return;
    }
    this.me = this.leaflet()
      .circleMarker(near, { radius: 7, className: 'menu-map-me' })
      .bindTooltip(() => this.t().youAreHere)
      .addTo(this.map());
  }

  private draw(): void {
    const L = this.leaflet();
    this.layer ??= L.layerGroup().addTo(this.map());
    this.layer.clearLayers();
    this.markers.clear();
    for (const pin of this.pins()) {
      const icon = L.divIcon({
        className: pin.writtenByMe ? 'menu-map-pin mine' : 'menu-map-pin',
        html: pin.bestScore === null ? '•' : pin.bestScore.toFixed(1),
        iconSize: [44, 30],
        iconAnchor: [22, 30],
      });
      const open = (): void => {
        this.opened.emit(pin);
      };
      const marker = L.marker(pin.location, { icon, keyboard: true })
        .on('click', open)
        .addTo(this.layer);
      const element = marker.getElement();
      if (element) {
        // A divIcon is named by its content (the score), so screen readers need a label.
        element.setAttribute('aria-label', this.label(pin));
        element.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            open();
          }
        });
        this.markers.set(pin.venue.id, element);
      }
    }
  }

  private fit(): void {
    const near = this.near();
    const points = [...this.pins().map((pin) => pin.location), ...(near ? [near] : [])];
    if (points.length > 0) {
      this.map().fitBounds(this.leaflet().latLngBounds(points), {
        padding: [40, 40],
        maxZoom: FIT_MAX_ZOOM,
      });
    }
  }

  private label(pin: MapPin): string {
    const t = this.t();
    const parts = [this.i18n.pick(pin.venue.name), t.pinSummary(pin.itemCount, pin.bestScore)];
    return (pin.writtenByMe ? [...parts, t.writtenByMe] : parts).join(', ');
  }
}
