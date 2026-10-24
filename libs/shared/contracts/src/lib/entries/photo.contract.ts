import { z } from 'zod';

/** REST base path: `/api/photos/:photoId`, an entry's photo for anyone holding its id (ADR 0011). */
export const photoPath = 'photos';

/** `/api/entries/:id/photo`: where the author uploads (PUT, the image as the body) or removes (DELETE) it. */
export function entryPhotoPath(entryId: string): string {
  return `entries/${entryId}/photo`;
}

/** 22 random URL-safe characters, changed whenever the photo or the entry's audience changes. */
export const PhotoIdSchema = z.string().regex(/^[\w-]{22}$/);

/** Where a client loads a photo: `/api/photos/<photoId>`. */
export const PhotoUrlSchema = z.string().regex(/^\/api\/photos\/[\w-]{22}$/);

export function photoUrl(photoId: string): string {
  return `/api/${photoPath}/${photoId}`;
}

/** The image types an upload may have, told apart by the file's first bytes. */
export const PhotoTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp']);

export type PhotoType = z.infer<typeof PhotoTypeSchema>;

/** The largest upload the API takes. The web app shrinks photos well below it. */
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
