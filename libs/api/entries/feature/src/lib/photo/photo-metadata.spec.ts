import { withoutMetadata } from './photo-metadata';

/** A JPEG segment: marker, then a big-endian length that counts itself. */
function segment(marker: number, payload: string): Buffer {
  const data = Buffer.from(payload, 'latin1');
  const length = Buffer.alloc(2);
  length.writeUInt16BE(data.length + 2);
  return Buffer.concat([Buffer.from([0xff, marker]), length, data]);
}

/** A PNG chunk; the CRC is not checked here, so zeros stand in. */
function chunk(type: string, payload: string): Buffer {
  const data = Buffer.from(payload, 'latin1');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  return Buffer.concat([length, Buffer.from(type, 'latin1'), data, Buffer.alloc(4)]);
}

/** A RIFF chunk, padded to an even size. */
function riffChunk(fourcc: string, payload: Buffer): Buffer {
  const size = Buffer.alloc(4);
  size.writeUInt32LE(payload.length);
  const pad = payload.length % 2 === 1 ? Buffer.alloc(1) : Buffer.alloc(0);
  return Buffer.concat([Buffer.from(fourcc, 'latin1'), size, payload, pad]);
}

function webp(...chunks: Buffer[]): Buffer {
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), ...chunks]);
  const size = Buffer.alloc(4);
  size.writeUInt32LE(body.length);
  return Buffer.concat([Buffer.from('RIFF', 'latin1'), size, body]);
}

describe('withoutMetadata', () => {
  it('drops EXIF, XMP and comments from a JPEG and keeps the image', () => {
    const jfif = segment(0xe0, 'JFIF\0');
    const icc = segment(0xe2, 'ICC_PROFILE\0');
    const scan = Buffer.from([0xff, 0xda, 0x00, 0x02, 1, 2, 0xff, 0x00, 3, 0xff, 0xd9]);
    const jpeg = Buffer.concat([
      Buffer.from([0xff, 0xd8]),
      jfif,
      segment(0xe1, 'Exif\0\0GPS 32.08N 34.78E'),
      icc,
      segment(0xfe, 'taken at home'),
      scan,
    ]);
    const clean = withoutMetadata(jpeg, 'image/jpeg');
    expect(clean).toEqual(Buffer.concat([Buffer.from([0xff, 0xd8]), jfif, icc, scan]));
    expect(clean.toString('latin1')).not.toContain('GPS');
  });

  it('drops text and EXIF chunks from a PNG', () => {
    const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const header = chunk('IHDR', '0123456789abc');
    const data = chunk('IDAT', 'pixels');
    const end = chunk('IEND', '');
    const png = Buffer.concat([
      signature,
      header,
      chunk('eXIf', 'GPS'),
      chunk('tEXt', 'Author\0me'),
      data,
      chunk('iTXt', 'Location'),
      end,
    ]);
    expect(withoutMetadata(png, 'image/png')).toEqual(
      Buffer.concat([signature, header, data, end]),
    );
  });

  it('drops EXIF and XMP from a WebP and clears their flags', () => {
    const vp8x = Buffer.alloc(10);
    vp8x[0] = 0x08 | 0x04 | 0x10; // EXIF, XMP and alpha
    const image = riffChunk('VP8L', Buffer.from('pixels!', 'latin1'));
    const clean = withoutMetadata(
      webp(
        riffChunk('VP8X', vp8x),
        image,
        riffChunk('EXIF', Buffer.from('GPS', 'latin1')),
        riffChunk('XMP ', Buffer.from('<x/>', 'latin1')),
      ),
      'image/webp',
    );
    const kept = Buffer.from(vp8x);
    kept[0] = 0x10;
    expect(clean).toEqual(webp(riffChunk('VP8X', kept), image));
  });

  it('refuses a file whose structure does not hold together', () => {
    const truncated = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from([0xff, 0xe1, 0x40])]);
    expect(() => withoutMetadata(truncated, 'image/jpeg')).toThrow();
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from([0, 0, 1, 0, 0x49, 0x44]),
    ]);
    expect(() => withoutMetadata(png, 'image/png')).toThrow();
  });
});
