import {
  type Currency,
  LongTextSchema,
  type Price,
  type Text,
  TextSchema,
} from '@menu/shared/contracts';
import { Prisma } from '../generated/prisma/client';

// A nullable Json column is cleared with DbNull; a plain null would store the JSON value null.
export const DbNull = Prisma.DbNull;

export interface DecimalColumn {
  toNumber(): number;
}

export function readText(column: unknown): Text {
  return TextSchema.parse(column);
}

export function readLongText(column: unknown): Text {
  return LongTextSchema.parse(column);
}

export function readPrice(value: DecimalColumn | null, currency: Currency | null): Price | null {
  if (value === null && currency === null) {
    return null;
  }
  if (value === null || currency === null) {
    throw new Error('A price needs both its value and its currency.');
  }
  return { value: value.toNumber(), currency };
}

export function writePrice(price: Price | null): {
  value: number | null;
  currency: Currency | null;
} {
  return { value: price?.value ?? null, currency: price?.currency ?? null };
}

export const PrismaErrorCode = {
  UniqueViolation: 'P2002',
  ForeignKeyViolation: 'P2003',
  NotFound: 'P2025',
} as const;

export function isPrismaError(
  error: unknown,
  code: (typeof PrismaErrorCode)[keyof typeof PrismaErrorCode],
): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}
