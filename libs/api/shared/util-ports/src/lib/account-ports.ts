/** Ports the users domain offers to the others (ADR 0004). */

/** Implemented by users: the names shown beside public entries. */
export interface AuthorDirectory {
  /** Display names by account id; unknown ids are left out. */
  displayNames(accountIds: readonly string[]): Promise<ReadonlyMap<string, string>>;
}

export const AUTHOR_DIRECTORY = Symbol('AUTHOR_DIRECTORY');
