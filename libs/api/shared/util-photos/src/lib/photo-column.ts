import { PhotoIdSchema, type PhotoType, PhotoTypeSchema } from '@menu/shared/contracts';

export interface PhotoColumn {
  id: string;
  contentType: PhotoType;
}

/** Reads a `photo` jsonb column: `{ id, contentType }` or null. */
export function readPhotoColumn(column: unknown): PhotoColumn | null {
  if (column === null) {
    return null;
  }
  if (typeof column !== 'object' || !('id' in column) || !('contentType' in column)) {
    throw new Error('A stored photo needs its id and content type.');
  }
  return {
    id: PhotoIdSchema.parse(column.id),
    contentType: PhotoTypeSchema.parse(column.contentType),
  };
}
