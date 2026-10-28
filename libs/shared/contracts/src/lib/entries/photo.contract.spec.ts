import { PhotoIdSchema, PhotoTypeSchema } from '../common/photo.contract';
import { itemPhotoUrl, ItemPhotoUrlSchema } from '../menus/item.contract';
import { photoUrl, PhotoUrlSchema } from './photo.contract';

describe('Photo contract', () => {
  const id = 'abcdefghijklmnopqrst_-';

  it('accepts a photo id and builds its URL', () => {
    expect(PhotoIdSchema.parse(id)).toBe(id);
    expect(PhotoUrlSchema.parse(photoUrl(id))).toBe(`/api/photos/${id}`);
    expect(ItemPhotoUrlSchema.parse(itemPhotoUrl(id))).toBe(`/api/item-photos/${id}`);
  });

  it('rejects a guessable or malformed id', () => {
    expect(PhotoIdSchema.safeParse('1').success).toBe(false);
    expect(PhotoUrlSchema.safeParse(`https://example.com/api/photos/${id}`).success).toBe(false);
    expect(PhotoUrlSchema.safeParse(itemPhotoUrl(id)).success).toBe(false);
    expect(ItemPhotoUrlSchema.safeParse(photoUrl(id)).success).toBe(false);
  });

  it('takes JPEG, PNG and WebP only', () => {
    expect(PhotoTypeSchema.safeParse('image/webp').success).toBe(true);
    expect(PhotoTypeSchema.safeParse('image/gif').success).toBe(false);
  });
});
