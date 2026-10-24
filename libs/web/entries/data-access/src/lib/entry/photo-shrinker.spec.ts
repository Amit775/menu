import { TestBed } from '@angular/core/testing';
import { fitWithin, PhotoShrinker } from './photo-shrinker';

describe('PhotoShrinker', () => {
  it('scales a large photo down to the long edge, keeping its shape', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
  });

  it('never enlarges a small photo', () => {
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('sends the file as it is where the browser cannot redraw it', async () => {
    const file = new Blob(['x'], { type: 'image/heic' });
    await expect(TestBed.inject(PhotoShrinker).shrink(file)).resolves.toBe(file);
  });

  it('sends the file as it is when it cannot be decoded', async () => {
    vi.stubGlobal('OffscreenCanvas', vi.fn());
    vi.stubGlobal('createImageBitmap', () => Promise.reject(new Error('not an image')));
    try {
      const file = new Blob(['x'], { type: 'image/heic' });
      await expect(TestBed.inject(PhotoShrinker).shrink(file)).resolves.toBe(file);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('redraws a decodable photo as a smaller JPEG', async () => {
    const drawImage = vi.fn();
    const close = vi.fn();
    const jpeg = new Blob(['small'], { type: 'image/jpeg' });
    let made: { width: number; height: number } | null = null;
    vi.stubGlobal(
      'OffscreenCanvas',
      class {
        constructor(width: number, height: number) {
          made = { width, height };
        }
        getContext() {
          return { drawImage };
        }
        convertToBlob() {
          return Promise.resolve(jpeg);
        }
      },
    );
    vi.stubGlobal('createImageBitmap', () => Promise.resolve({ width: 4000, height: 2000, close }));
    try {
      const result = await TestBed.inject(PhotoShrinker).shrink(new Blob(['big']));
      expect(result).toBe(jpeg);
      expect(made).toEqual({ width: 1600, height: 800 });
      expect(drawImage).toHaveBeenCalled();
      expect(close).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
