import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import type * as Leaflet from 'leaflet';

/**
 * Leaflet's stylesheet, built as its own unhashed bundle (`apps/web/project.json`,
 * named after the version so a new version is a new file), so the map's CSS loads only with the map.
 */
export const LEAFLET_STYLESHEET = 'leaflet-1.9.4.css';

/** Loads Leaflet and its stylesheet on first use, keeping both out of every other screen. */
@Injectable({ providedIn: 'root' })
export class LeafletLoader {
  private readonly document = inject(DOCUMENT);
  private leaflet: Promise<typeof Leaflet> | undefined;

  load(): Promise<typeof Leaflet> {
    if (!this.document.querySelector(`link[href="${LEAFLET_STYLESHEET}"]`)) {
      const link = this.document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_STYLESHEET;
      this.document.head.appendChild(link);
    }
    // Leaflet is CommonJS: the bundler may wrap it in a `default` export.
    this.leaflet ??= import('leaflet').then(
      (module) => (module as { default?: typeof Leaflet }).default ?? module,
    );
    return this.leaflet;
  }
}
