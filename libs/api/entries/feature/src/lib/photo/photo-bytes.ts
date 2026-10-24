import { Logger, PayloadTooLargeException } from '@nestjs/common';
import { type PhotoStorage } from '@menu/api/entries/data-access';
import { PHOTO_MAX_BYTES, type PhotoType } from '@menu/shared/contracts';

const startsWith = (bytes: Buffer, signature: number[], at = 0): boolean =>
  signature.every((byte, index) => bytes[at + index] === byte);

/** The image type by its first bytes, whatever the request claims; null for anything else. */
export function photoTypeOf(bytes: Buffer): PhotoType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return 'image/jpeg';
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') {
    return 'image/webp';
  }
  return null;
}

/** Reads a request body up to `limit` bytes; more is refused before it is all read. */
export async function readBody(
  body: AsyncIterable<Buffer | string>,
  limit = PHOTO_MAX_BYTES,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of body) {
    const bytes = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
    size += bytes.length;
    if (size > limit) {
      throw new PayloadTooLargeException(`A photo may be at most ${String(limit)} bytes.`);
    }
    chunks.push(bytes);
  }
  return Buffer.concat(chunks);
}

/** Where an entry's photo is stored: one object per entry, replaced by a new upload. */
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
