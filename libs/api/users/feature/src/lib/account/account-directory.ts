import { Injectable } from '@nestjs/common';
import { AccountRepository } from '@menu/api/users/data-access';
import { type AuthorDirectory } from '@menu/api/shared/util-ports';

@Injectable()
export class AccountDirectory implements AuthorDirectory {
  constructor(private readonly repository: AccountRepository) {}

  displayNames(accountIds: readonly string[]): Promise<ReadonlyMap<string, string>> {
    if (accountIds.length === 0) {
      return Promise.resolve(new Map());
    }
    return this.repository.displayNames([...new Set(accountIds)]);
  }
}
