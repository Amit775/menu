import { type LocalizedText } from '@menu/shared/contracts';

/** `LocalizedText` is stored as `<name>_he` and a nullable `<name>_en` column. */
export interface LocalizedColumns {
  nameHe: string;
  nameEn: string | null;
}

export function toLocalized(row: LocalizedColumns): LocalizedText {
  return row.nameEn === null ? { he: row.nameHe } : { he: row.nameHe, en: row.nameEn };
}

export function fromLocalized(text: LocalizedText): LocalizedColumns {
  return { nameHe: text.he, nameEn: text.en ?? null };
}

/** Prisma's known request error codes this codebase reacts to. */
export const PrismaErrorCode = {
  /** Unique constraint failed. */
  UniqueViolation: 'P2002',
  /** Foreign key constraint failed. */
  ForeignKeyViolation: 'P2003',
  /** The record to update or delete does not exist. */
  NotFound: 'P2025',
} as const;

/** True when `error` is a Prisma known request error with this code. */
export function isPrismaError(
  error: unknown,
  code: (typeof PrismaErrorCode)[keyof typeof PrismaErrorCode],
): boolean {
  return (
    typeof error === 'object' && error !== null && 'code' in error && error.code === code
  );
}
