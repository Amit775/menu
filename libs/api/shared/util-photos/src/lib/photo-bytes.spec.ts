import { PayloadTooLargeException, UnsupportedMediaTypeException } from '@nestjs/common';
import { cleanPhoto, photoTypeOf, readBody } from './photo-bytes';

async function* chunks(...parts: Buffer[]): AsyncIterable<Buffer> {
  for (const part of parts) {
    yield await Promise.resolve(part);
  }
}

describe('photo bytes', () => {
  it('knows JPEG, PNG and WebP by their first bytes', () => {
    expect(photoTypeOf(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0]))).toBe('image/jpeg');
    expect(photoTypeOf(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      'image/png',
    );
    expect(photoTypeOf(Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'latin1'))).toBe('image/webp');
  });

  it('refuses anything else, whatever it is called', () => {
    expect(photoTypeOf(Buffer.from('GIF89a'))).toBeNull();
    expect(photoTypeOf(Buffer.from('<svg/>'))).toBeNull();
    expect(photoTypeOf(Buffer.alloc(0))).toBeNull();
  });

  it('reads a body in pieces', async () => {
    await expect(readBody(chunks(Buffer.from('ab'), Buffer.from('cd')))).resolves.toEqual(
      Buffer.from('abcd'),
    );
  });

  it('stops reading a body over the limit', async () => {
    await expect(readBody(chunks(Buffer.alloc(3), Buffer.alloc(3)), 5)).rejects.toBeInstanceOf(
      PayloadTooLargeException,
    );
  });

  it('keeps a photo it knows, without its metadata, and refuses one it does not', () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02, 1, 2, 3]);
    const exif = Buffer.from([0xff, 0xe1, 0x00, 0x05, 0x47, 0x50, 0x53]);
    expect(cleanPhoto(Buffer.concat([jpeg.subarray(0, 2), exif, jpeg.subarray(2)]))).toEqual({
      bytes: jpeg,
      type: 'image/jpeg',
    });
    expect(() => cleanPhoto(Buffer.from('GIF89a', 'latin1'))).toThrow(
      UnsupportedMediaTypeException,
    );
  });
});
