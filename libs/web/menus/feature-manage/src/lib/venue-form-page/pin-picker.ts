import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  inject,
  type OnChanges,
  input,
  output,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { type GeoPoint } from '@menu/shared/contracts';
import { LeafletLoader, OSM_ATTRIBUTION, OSM_TILES, TEL_AVIV } from '@menu/web/shared/util-map';
import type * as Leaflet from 'leaflet';

const PIN_ZOOM = 17;

@Component({
  selector: 'menu-pin-picker',
  template:
    '<div #map class="menu-pin-picker-map" dir="ltr" [attr.aria-label]="label()" role="application"></div>',
  styles: `
    menu-pin-picker {
      display: block;
    }

    .menu-pin-picker-map {
      height: 240px;
      border-radius: 12px;
      overflow: hidden;
    }

    .menu-pin-picker-pin {
      width: 18px;
      height: 18px;
      border: 3px solid var(--mat-sys-on-primary);
      border-radius: 50%;
      background: var(--mat-sys-primary);
      box-shadow: 0 1px 4px rgb(0 0 0 / 40%);
    }
  `,
  // The pin is drawn by Leaflet outside this view, so its styles are global (scoped by class).
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PinPicker implements OnChanges {
  readonly point = input<GeoPoint | null>(null);
  readonly label = input.required<string>();
  readonly picked = output<GeoPoint>();

  private readonly loader = inject(LeafletLoader);
  private readonly container = viewChild.required<ElementRef<HTMLElement>>('map');

  private leaflet: typeof Leaflet | undefined;
  private map: Leaflet.Map | undefined;
  private pin: Leaflet.Marker | undefined;
  /** The point the user last tapped or dragged to: the map is already there. */
  private lastPicked: GeoPoint | null = null;
  private destroyed = false;

  constructor() {
    afterNextRender(() => void this.init());
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.map?.remove();
    });
  }

  ngOnChanges(): void {
    const point = this.point();
    this.place(point);
    if (point && (point.lat !== this.lastPicked?.lat || point.lng !== this.lastPicked.lng)) {
      this.map?.panTo(point);
    }
  }

  private async init(): Promise<void> {
    const L = await this.loader.load();
    if (this.destroyed) {
      return;
    }
    const point = this.point();
    this.leaflet = L;
    this.map = L.map(this.container().nativeElement).setView(
      point ?? TEL_AVIV,
      point ? PIN_ZOOM : 13,
    );
    L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(this.map);
    this.map.on('click', (event: Leaflet.LeafletMouseEvent) => {
      this.pick(event.latlng);
    });
    this.place(point);
  }

  /** Puts the pin at the point (or keeps it there), without telling the form. */
  private place(point: GeoPoint | null): void {
    const { leaflet: L, map } = this;
    if (!L || !map || !point) {
      return;
    }
    if (this.pin) {
      this.pin.setLatLng(point);
      return;
    }
    const icon = L.divIcon({ className: 'menu-pin-picker-pin', iconSize: [18, 18] });
    this.pin = L.marker(point, { icon, draggable: true, keyboard: false })
      .on('dragend', () => {
        const at = this.pin?.getLatLng();
        if (at) {
          this.pick(at);
        }
      })
      .addTo(map);
  }

  private pick(at: { lat: number; lng: number }): void {
    // Six decimals is about 10 cm: plenty, and it keeps the fields readable.
    const point = { lat: round(at.lat), lng: round(at.lng) };
    this.lastPicked = point;
    this.place(point);
    this.picked.emit(point);
  }
}

function round(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}
