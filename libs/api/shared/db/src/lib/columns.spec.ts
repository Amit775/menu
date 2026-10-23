import { fromLocalized, isPrismaError, PrismaErrorCode, toLocalized } from './columns';

describe('localized columns', () => {
  it('round-trips a name with and without English', () => {
    expect(toLocalized(fromLocalized({ he: 'סלט', en: 'Salad' }))).toEqual({ he: 'סלט', en: 'Salad' });
    expect(fromLocalized({ he: 'סלט' })).toEqual({ nameHe: 'סלט', nameEn: null });
    expect(toLocalized({ nameHe: 'סלט', nameEn: null })).toEqual({ he: 'סלט' });
  });
});

describe('isPrismaError', () => {
  it('matches a Prisma error by code', () => {
    expect(isPrismaError({ code: 'P2002' }, PrismaErrorCode.UniqueViolation)).toBe(true);
    expect(isPrismaError({ code: 'P2003' }, PrismaErrorCode.UniqueViolation)).toBe(false);
    expect(isPrismaError(new Error('x'), PrismaErrorCode.NotFound)).toBe(false);
  });
});
