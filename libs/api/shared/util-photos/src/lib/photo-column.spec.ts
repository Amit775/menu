import { readPhotoColumn } from './photo-column';

describe('readPhotoColumn', () => {
  it('reads a stored photo, or none', () => {
    expect(readPhotoColumn({ id: 'abcdefghijklmnopqrstuv', contentType: 'image/png' })).toEqual({
      id: 'abcdefghijklmnopqrstuv',
      contentType: 'image/png',
    });
    expect(readPhotoColumn(null)).toBeNull();
  });

  it('rejects a stored photo without its type', () => {
    expect(() => readPhotoColumn({ id: 'abcdefghijklmnopqrstuv' })).toThrow();
  });
});
