import { isPrismaError, PrismaErrorCode, readPrice, readText, writePrice } from './columns';

describe('Text columns', () => {
  it('reads a stored Text and rejects one without Hebrew', () => {
    expect(readText({ he: 'סלט', en: 'Salad' })).toEqual({ he: 'סלט', en: 'Salad' });
    expect(readText({ he: 'סלט', en: null })).toEqual({ he: 'סלט', en: null });
    expect(() => readText({ en: 'Salad' })).toThrow();
  });
});

describe('Price columns', () => {
  it('reads a decimal value with its currency', () => {
    expect(readPrice({ toNumber: () => 68.5 }, 'ILS')).toEqual({
      value: 68.5,
      currency: 'ILS' as const,
    });
    expect(readPrice(null, null)).toBeNull();
  });

  it('rejects half a price', () => {
    expect(() => readPrice({ toNumber: () => 68.5 }, null)).toThrow();
  });

  it('writes a price as its two columns', () => {
    expect(writePrice({ value: 68.5, currency: 'ILS' as const })).toEqual({
      value: 68.5,
      currency: 'ILS' as const,
    });
    expect(writePrice(null)).toEqual({ value: null, currency: null });
  });
});

describe('isPrismaError', () => {
  it('matches a Prisma error by code', () => {
    expect(isPrismaError({ code: 'P2002' }, PrismaErrorCode.UniqueViolation)).toBe(true);
    expect(isPrismaError({ code: 'P2003' }, PrismaErrorCode.UniqueViolation)).toBe(false);
    expect(isPrismaError(new Error('x'), PrismaErrorCode.NotFound)).toBe(false);
  });
});
