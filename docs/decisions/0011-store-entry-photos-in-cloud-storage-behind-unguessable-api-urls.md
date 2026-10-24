# 0011. Store entry photos in Cloud Storage behind unguessable API URLs

- Status: accepted
- Date: 2026-10-24

## Context

An entry may carry one photo (spec: Entry). Who may see the photo follows the entry: only its author while it is private, anyone holding the link while it is shared, and everyone while it is public and not hidden. Discover shows an item's photo from its newest public entry.

Browsers load images with `<img src>`, which sends no `Authorization` header, so the API cannot check the viewer per request. Signed Cloud Storage URLs would need a signing key or an extra IAM role on the API's service account. Client access to the bucket would need Storage security rules that copy the API's privacy rules. No new dependency is approved for photos; `firebase-admin` (already approved) includes Cloud Storage.

## Decision

- The API stores each entry's photo in the Firebase Storage bucket (`<project>.firebasestorage.app`, or `PHOTO_BUCKET`), under `entries/<entryId>`. The bucket's rules stay deny-all; only the API's service account reads and writes it.
- The author uploads the image as the request body of `PUT /api/entries/:id/photo` (JPEG, PNG or WebP, at most 8 MB, checked by its first bytes) and removes it with `DELETE /api/entries/:id/photo`. The web app shrinks photos before uploading when the browser can.
- An entry with a photo has a `photoId`: 22 random URL-safe characters, like a share token. `GET /api/photos/:photoId` serves the bytes to anyone holding that id. The id is a capability, and the API hands it only to those who may see the entry: the author, readers of a public entry, and holders of a share link.
- When an entry's audience narrows (public to shared or private, shared to private), or an Admin hides it, the `photoId` changes, so ids handed out before stop working; only the author gets the new one. A replaced photo also gets a new id.
- Local development and e2e set `PHOTO_DIR` to keep photos on disk instead of in Cloud Storage; specs use an in-memory store.

## Consequences

- No new dependency and no extra IAM role. The only console steps are creating the bucket and letting the API's service account use it (`docs/deployment.md`).
- A photo id copied out of the app keeps working until the entry's audience narrows. That is the same promise a share link makes.
- Photos pass through the API, which costs Cloud Run time and egress. Responses carry a long `Cache-Control` (the id changes whenever the content or audience does), so browsers absorb repeat views. Signed or CDN URLs can replace this behind the same `photoUrl` field if traffic grows.
