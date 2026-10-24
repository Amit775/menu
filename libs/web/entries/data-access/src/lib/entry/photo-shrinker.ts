import { Injectable } from '@angular/core';

/** The long edge of an uploaded photo, in pixels. */
export const PHOTO_EDGE = 1600;
const QUALITY = 0.85;

/** The size a photo is drawn at: at most `edge` on its long side, never enlarged. */
export function fitWithin(
  width: number,
  height: number,
  edge = PHOTO_EDGE,
): { width: number; height: number } {
  const scale = Math.min(1, edge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/**
 * Makes a picked photo small enough to upload: redrawn at most PHOTO_EDGE
 * pixels on its long side as a JPEG. Redrawing also drops its metadata (such as
 * where it was taken). Where the browser cannot decode or redraw it, the file
 * goes as it is and the API decides.
 */
@Injectable({ providedIn: 'root' })
export class PhotoShrinker {
  async shrink(file: Blob): Promise<Blob> {
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') {
      return file;
    }
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const size = fitWithin(bitmap.width, bitmap.height);
      const canvas = new OffscreenCanvas(size.width, size.height);
      const context = canvas.getContext('2d');
      if (!context) {
        bitmap.close();
        return file;
      }
      context.drawImage(bitmap, 0, 0, size.width, size.height);
      bitmap.close();
      return await canvas.convertToBlob({ type: 'image/jpeg', quality: QUALITY });
    } catch {
      return file;
    }
  }
}
