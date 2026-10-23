import { DOCUMENT } from '@angular/common';
import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import { type GeoPoint } from '@menu/shared/contracts';

/** The part of the browser's Geolocation API the app uses. */
export interface PositionSource {
  getCurrentPosition(
    success: (position: { coords: { latitude: number; longitude: number } }) => void,
    error: () => void,
    options: { enableHighAccuracy: boolean; timeout: number; maximumAge: number },
  ): void;
}

/** The browser's geolocation, or null where there is none (SSR, old browsers). */
export const POSITION_SOURCE = new InjectionToken<PositionSource | null>('POSITION_SOURCE', {
  providedIn: 'root',
  factory: () => inject(DOCUMENT).defaultView?.navigator.geolocation ?? null,
});

/**
 * How long a screen waits for the position before loading without it. The
 * browser's own timeout only starts once the user answers the permission
 * prompt, and some browsers never call back when the prompt is dismissed.
 */
export const LOCATION_WAIT_MS = 3000;

/**
 * Where the device is, when the user allows it. Asked once per visit; a refusal,
 * a slow answer or no answer gives null, and discovery carries on without distances.
 * A position that arrives late is still kept for the next load.
 */
@Injectable({ providedIn: 'root' })
export class DeviceLocation {
  private readonly source = inject(POSITION_SOURCE);
  private request: Promise<GeoPoint | null> | undefined;
  private readonly current = signal<GeoPoint | null>(null);

  readonly position = this.current.asReadonly();

  locate(): Promise<GeoPoint | null> {
    const known = this.current();
    if (known) {
      return Promise.resolve(known);
    }
    this.request ??= this.ask();
    return Promise.race([
      this.request,
      new Promise<null>((resolve) => {
        setTimeout(() => {
          resolve(null);
        }, LOCATION_WAIT_MS);
      }),
    ]);
  }

  private ask(): Promise<GeoPoint | null> {
    return new Promise((resolve) => {
      if (!this.source) {
        resolve(null);
        return;
      }
      this.source.getCurrentPosition(
        ({ coords }) => {
          const point = { lat: coords.latitude, lng: coords.longitude };
          this.current.set(point);
          resolve(point);
        },
        () => {
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
      );
    });
  }
}
