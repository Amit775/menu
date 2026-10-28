import { Logger } from '@nestjs/common';
import { type PhotoStorage } from '@menu/api/shared/util-photos';

export function entryPhotoKey(entryId: string): string {
  return `entries/${entryId}`;
}

/**
 * Removes an entry's stored photo after its id is gone. The id no longer
 * reaches it, so a failure is logged rather than failing the request.
 */
export async function deletePhoto(storage: PhotoStorage, entryId: string): Promise<void> {
  try {
    await storage.delete(entryPhotoKey(entryId));
  } catch (error) {
    Logger.warn(`Could not delete the photo of entry ${entryId}: ${String(error)}`, 'Photos');
  }
}
