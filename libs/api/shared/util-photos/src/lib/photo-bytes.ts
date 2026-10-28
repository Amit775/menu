import { PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import { PHOTO_MAX_BYTES, type PhotoType } from '@menu/shared/contracts';
import { withoutMetadata } from './photo-metadata';
import { type StoredPhoto } from './photo-storage';

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

/** The photo to store: a JPEG, PNG or WebP by its bytes, with its metadata dropped (ADR 0011). */
export function cleanPhoto(bytes: Buffer): StoredPhoto {
  const type = photoTypeOf(bytes);
  if (!type) {
    throw new UnsupportedMediaTypeException('Send a JPEG, PNG or WebP photo.');
  }
  try {
    return { bytes: withoutMetadata(bytes, type), type };
  } catch {
    throw new UnsupportedMediaTypeException('This photo could not be read.');
  }
}
