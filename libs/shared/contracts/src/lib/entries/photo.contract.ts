import { z } from 'zod';

export const photoPath = 'photos';

export function entryPhotoPath(entryId: string): string {
  return `entries/${entryId}/photo`;
}

export const PhotoUrlSchema = z.string().regex(/^\/api\/photos\/[\w-]{22}$/);

export function photoUrl(photoId: string): string {
  return `/api/${photoPath}/${photoId}`;
}
