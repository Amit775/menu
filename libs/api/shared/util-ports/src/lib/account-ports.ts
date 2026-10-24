export interface AuthorDirectory {
  displayNames(accountIds: readonly string[]): Promise<ReadonlyMap<string, string>>;
}

export const AUTHOR_DIRECTORY = Symbol('AUTHOR_DIRECTORY');
