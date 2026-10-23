import {
  AgorotSchema,
  GeoPointSchema,
  LanguageSchema,
  LocalizedTextSchema,
} from './values.contract';

describe('shared value contracts', () => {
  it('accepts text in Hebrew and English', () => {
    expect(LocalizedTextSchema.parse({ he: 'המבורגר', en: 'Hamburger' })).toEqual({
      he: 'המבורגר',
      en: 'Hamburger',
    });
  });

  it('requires the Hebrew text and allows English to be missing', () => {
    expect(LocalizedTextSchema.safeParse({ en: 'Hamburger' }).success).toBe(false);
    expect(LocalizedTextSchema.parse({ he: 'המבורגר' })).toEqual({ he: 'המבורגר' });
  });

  it('trims names and rejects blank ones', () => {
    expect(LocalizedTextSchema.parse({ he: '  סלט  ' })).toEqual({ he: 'סלט' });
    expect(LocalizedTextSchema.safeParse({ he: '   ' }).success).toBe(false);
  });

  it('stores prices as whole agorot', () => {
    expect(AgorotSchema.parse(6800)).toBe(6800);
    expect(AgorotSchema.safeParse(68.5).success).toBe(false);
    expect(AgorotSchema.safeParse(-1).success).toBe(false);
  });

  it('rejects a point outside the globe', () => {
    expect(GeoPointSchema.parse({ lat: 32.08, lng: 34.78 })).toEqual({ lat: 32.08, lng: 34.78 });
    expect(GeoPointSchema.safeParse({ lat: 91, lng: 0 }).success).toBe(false);
  });

  it('supports Hebrew and English only', () => {
    expect(LanguageSchema.options).toEqual(['he', 'en']);
    expect(LanguageSchema.safeParse('fr').success).toBe(false);
  });
});
