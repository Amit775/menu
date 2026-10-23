/** Optional fields with `undefined` removed from their type. */
export type Defined<T> = { [K in keyof T]?: Exclude<T[K], undefined> };

/**
 * Drops keys whose value is `undefined`. Zod's `.partial()` types optional
 * fields as `T | undefined`, which Prisma rejects under
 * `exactOptionalPropertyTypes`; pass partial updates through this first.
 */
export function withoutUndefined<T extends object>(input: T): Defined<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Defined<T>;
}
