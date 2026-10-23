import { type GeoPoint } from '@menu/shared/contracts';

/** Where a map opens before any pin or position is known. */
export const TEL_AVIV: GeoPoint = { lat: 32.0853, lng: 34.7818 };

/** OpenStreetMap tiles (ADR 0008) and the credit they require. */
export const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
