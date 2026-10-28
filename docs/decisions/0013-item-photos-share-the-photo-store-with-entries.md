# 0013. Item photos share the photo store with entries

- Status: accepted
- Date: 2026-10-28

## Context

The venue's Owner or an Admin may put a photo on an item, so the feed shows a dish before anyone has logged it with a photo (plan `docs/plans/2026-10-28-item-model.md`, slice 5; contributors get the same right in phase 3). Entry photos already have a store, metadata stripping and upload limits (ADR 0011), but they live in the `entries` domain, which `menus` must not import (ADR 0004).

## Decision

- Photo storage (`PhotoStorage`, memory, disk and Cloud Storage), type detection, metadata stripping, body reading and the `photo` column reader move to `@menu/api/shared/util-photos` (`scope:shared`). `newCapabilityId` moves to `@menu/api/shared/util`. Both domains use them; each module provides its own `PHOTO_STORAGE` from the same environment, so both write to the same bucket or folder.
- An item's photo is stored under `items/<photoId>`, next to `entries/<entryId>`. The item keeps `{ id, contentType }` in a `photo` jsonb column, like an entry. Keying by photo id means an id only ever serves the bytes it was made for.
- `PUT /api/items/:id/photo` and `DELETE /api/items/:id/photo` are for the venue's Owner or an Admin, on a pending or approved item. A new photo's bytes are stored first, then the item points at its new id, then the old bytes are deleted. Item photos are public, so the entry rule of saving the id first (ADR 0011) is not needed.
- `menus` serves the bytes at `GET /api/item-photos/:photoId`. Item photos are public, so the response may be cached by anyone (`Cache-Control: public, immutable`); the id changes with the photo, so a cached copy never goes stale.
- `ItemPhotoUrlSchema` (`/api/item-photos/<id>`) is separate from the entries' `PhotoUrlSchema`; only the discover item accepts either. The photo id, type and size limit move to `common/photo.contract`, so the menus contract does not import the entries one. Discover shows the newest public entry photo first and the item's own photo when there is none.

## Consequences

- No new bucket, permission or dependency: the API's service account already writes the photo bucket.
- An archived, rejected or merged item keeps its photo, but it can no longer be changed. Its photo id stays valid.
- Removing a photo whose bytes cannot be deleted leaves the bytes behind with no id pointing at them; a cleanup job can sweep `items/` later.
- Entries still own the `/api/photos` route; item photos never pass through it, so entry privacy rules (ADR 0011) are untouched.
