# 0008. Map with Leaflet and OpenStreetMap

- Status: accepted
- Date: 2026-10-23
- Amends: ADR 0001 (adds `leaflet` to the fixed stack)

## Context

The discover screen has a reels | list | map switch (product spec, mockups). The map shows one pin per venue that has items matching the filters, labelled with the venue's best score. The product owner approved `leaflet` and `@types/leaflet` with OpenStreetMap tiles on 2026-10-23, and ruled out Google Maps (no API key or billing for the MVP).

## Decision

- **Library:** `leaflet` (1.9.x) with `@types/leaflet`, used only from `@menu/web/discover/feature-feed` (`map/`).
  - `LeafletLoader` imports Leaflet dynamically on first use, so it is not in the initial bundle or the reels and list screens.
  - Leaflet ships only a UMD build, so it is listed in `allowedCommonJsDependencies`.
  - Leaflet's stylesheet is its own unhashed bundle in `apps/web/project.json` (`leaflet-1.9.4.css`, `inject: false`). The loader adds the `<link>` on first use. The version is in the name because Hosting caches `.css` for a year: on a Leaflet upgrade, rename the bundle and `LEAFLET_STYLESHEET` together.
- **Tiles:** `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, with the required "© OpenStreetMap contributors" attribution.
- **Pins:** `L.divIcon` with the best score as text, so there are no marker images to ship. The map container is `dir="ltr"` inside the RTL app, as Leaflet expects.
  - Each pin gets an `aria-label` (venue, item count, best score, whether you wrote there), set as an attribute, never as HTML.
  - Tapping a pin, or Enter/Space on a focused pin, opens an Angular card that links to the venue. Focus moves to the card; Escape closes it and returns focus to the pin. Leaflet's own popups are not used, so the text stays translated and testable.
  - The map fits the pins and the user's position, never closer than zoom 15.
- **Data:** `GET /api/discover/map` with the feed's filters (distance, tags), through `DiscoverApiClient.map` and `FeedStore`.

## Consequences

- OpenStreetMap's tile servers are for light use under their [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). That fits friends-scale use. Before a public launch, move to a tile provider with an agreement (MapTiler, Stadia, or self-hosted tiles). Only `OSM_TILES` and `OSM_ATTRIBUTION` change.
- Leaflet touches `window` when imported, so the map stays client-only. That is fine for the SPA. Capacitor works the same way, and SSR will skip the map.
- Unit tests replace `LeafletLoader` with a small fake. `apps/web-e2e` checks the real map in the built app: Leaflet loads, its stylesheet is served as CSS, and pins open by keyboard.
- Slice 12 moves `LeafletLoader` and the tile constants into `web-shared-util-map` (`platform:web`, `scope:shared`, `type:util`), because Admins also drop a venue's pin in the menus domain. The lib holds no domain types and no components; each domain draws its own map.
