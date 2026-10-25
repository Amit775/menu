import {
  CurrencySchema,
  GeoPointSchema,
  LanguageSchema,
  PriceSchema,
  ShekelsSchema,
  TextSchema,
} from './values.contract';

describe('shared value contracts', () => {
  it('accepts text in Hebrew and English', () => {
    expect(TextSchema.parse({ he: 'המבורגר', en: 'Hamburger' })).toEqual({
      he: 'המבורגר',
      en: 'Hamburger',
    });
  });

  it('requires the Hebrew text and takes null for missing English', () => {
    expect(TextSchema.safeParse({ he: null, en: 'Hamburger' }).success).toBe(false);
    expect(TextSchema.parse({ he: 'המבורגר', en: null })).toEqual({ he: 'המבורגר', en: null });
    expect(TextSchema.safeParse({ he: 'המבורגר' }).success).toBe(false);
  });

  it('trims text and reads blank English as missing', () => {
    expect(TextSchema.parse({ he: '  סלט  ', en: '   ' })).toEqual({ he: 'סלט', en: null });
    expect(TextSchema.safeParse({ he: '   ', en: null }).success).toBe(false);
  });

  it('prices in shekels with at most two decimals', () => {
    expect(PriceSchema.parse({ value: 68.5, currency: 'ILS' })).toEqual({
      value: 68.5,
      currency: 'ILS',
    });
    expect(ShekelsSchema.parse(0.07)).toBe(0.07);
    expect(ShekelsSchema.parse(19.99)).toBe(19.99);
    expect(ShekelsSchema.safeParse(68.555).success).toBe(false);
    expect(ShekelsSchema.safeParse(-1).success).toBe(false);
    expect(ShekelsSchema.safeParse(100_000_000).success).toBe(false);
  });

  it('knows only the shekel for now', () => {
    expect(CurrencySchema.options).toEqual(['ILS']);
    expect(PriceSchema.safeParse({ value: 10, currency: 'USD' }).success).toBe(false);
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
