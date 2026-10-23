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
 * Where the device is, when the user allows it. Asked once per visit; a refusal
 * or a timeout gives null, and discovery carries on without distances.
 */
@Injectable({ providedIn: 'root' })
export class DeviceLocation {
  private readonly source = inject(POSITION_SOURCE);
  private pending: Promise<GeoPoint | null> | undefined;
  private readonly current = signal<GeoPoint | null>(null);

  readonly position = this.current.asReadonly();

  locate(): Promise<GeoPoint | null> {
    this.pending ??= new Promise((resolve) => {
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
    return this.pending;
  }
}
