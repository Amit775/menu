import { type PhotoType } from '@menu/shared/contracts';

/** JPEG segments kept before the image data: JFIF, the colour profile and Adobe's colour transform. */
const JPEG_KEPT = new Set([0xe0, 0xe2, 0xee]);
const JPEG_START_OF_SCAN = 0xda;
const JPEG_COMMENT = 0xfe;
const PNG_DROPPED = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
const WEBP_DROPPED = new Set(['EXIF', 'XMP ']);
const WEBP_METADATA_FLAGS = 0x08 | 0x04;

class MalformedPhoto extends Error {
  constructor() {
    super('The photo file is malformed.');
  }
}

function need(bytes: Buffer, end: number): void {
  if (end > bytes.length) {
    throw new MalformedPhoto();
  }
}

/**
 * The photo without what it says about where, when and on what it was taken
 * (EXIF with GPS, XMP, comments, text chunks). The browser already redraws
 * photos; this covers clients that cannot. Throws on a file that does not
 * parse. JPEG orientation goes with EXIF, so a photo that skipped the browser
 * redraw may show turned.
 */
export function withoutMetadata(bytes: Buffer, type: PhotoType): Buffer {
  switch (type) {
    case 'image/jpeg':
      return jpegWithoutMetadata(bytes);
    case 'image/png':
      return pngWithoutMetadata(bytes);
    case 'image/webp':
      return webpWithoutMetadata(bytes);
  }
}

function jpegWithoutMetadata(bytes: Buffer): Buffer {
  const kept: Buffer[] = [bytes.subarray(0, 2)];
  let at = 2;
  for (;;) {
    need(bytes, at + 2);
    if (bytes[at] !== 0xff) {
      throw new MalformedPhoto();
    }
    const marker = bytes[at + 1] ?? 0;
    if (marker === 0xff) {
      at += 1; // fill byte
      continue;
    }
    if (marker === JPEG_START_OF_SCAN) {
      kept.push(bytes.subarray(at));
      return Buffer.concat(kept);
    }
    need(bytes, at + 4);
    const end = at + 2 + bytes.readUInt16BE(at + 2);
    need(bytes, end);
    const isApp = marker >= 0xe0 && marker <= 0xef;
    if (!(isApp && !JPEG_KEPT.has(marker)) && marker !== JPEG_COMMENT) {
      kept.push(bytes.subarray(at, end));
    }
    at = end;
  }
}

function pngWithoutMetadata(bytes: Buffer): Buffer {
  const kept: Buffer[] = [bytes.subarray(0, 8)];
  let at = 8;
  while (at < bytes.length) {
    need(bytes, at + 8);
    const end = at + 12 + bytes.readUInt32BE(at);
    need(bytes, end);
    if (!PNG_DROPPED.has(bytes.toString('latin1', at + 4, at + 8))) {
      kept.push(bytes.subarray(at, end));
    }
    at = end;
  }
  return Buffer.concat(kept);
}

function webpWithoutMetadata(bytes: Buffer): Buffer {
  const kept: Buffer[] = [];
  let at = 12;
  while (at < bytes.length) {
    need(bytes, at + 8);
    const fourcc = bytes.toString('latin1', at, at + 4);
    const size = bytes.readUInt32LE(at + 4);
    const end = at + 8 + size + (size % 2);
    need(bytes, end);
    if (!WEBP_DROPPED.has(fourcc)) {
      const piece = Buffer.from(bytes.subarray(at, end));
      if (fourcc === 'VP8X' && size > 0) {
        piece[8] = (piece[8] ?? 0) & ~WEBP_METADATA_FLAGS;
      }
      kept.push(piece);
    }
    at = end;
  }
  const body = Buffer.concat([bytes.subarray(8, 12), ...kept]);
  const header = Buffer.from(bytes.subarray(0, 8));
  header.writeUInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}
