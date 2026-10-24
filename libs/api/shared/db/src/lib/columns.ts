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
