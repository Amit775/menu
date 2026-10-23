import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccountRepository } from '@menu/api/users/data-access';
import {
  type Principal,
  type PrincipalResolver,
  type VerifiedIdentity,
} from '@menu/api/shared/util-auth';
import { type Account, type AccountSummary, type UpdateAccount } from '@menu/shared/contracts';
import { USERS_CONFIG, type UsersConfig } from './users.config';

/** Accounts and roles. Also resolves the caller of every request for `AuthGuard`. */
@Injectable()
export class AccountService implements PrincipalResolver {
  constructor(
    private readonly repository: AccountRepository,
    @Inject(USERS_CONFIG) private readonly config: UsersConfig,
  ) {}

  async resolve(identity: VerifiedIdentity): Promise<Principal> {
    const account = await this.repository.findOrCreateByFirebaseUid({
      firebaseUid: identity.uid,
      displayName: identity.name?.trim().slice(0, 60) ?? '',
      isAdmin: this.config.bootstrapAdminUids.includes(identity.uid),
    });
    return {
      accountId: account.id,
      isAdmin: account.isAdmin,
      language: account.language,
      ownedVenueIds: account.ownedVenueIds,
    };
  }

  async get(id: string): Promise<Account> {
    const account = await this.repository.findById(id);
    if (!account) {
      throw new NotFoundException('Account not found.');
    }
    return account;
  }

  async update(id: string, input: UpdateAccount): Promise<Account> {
    const account = await this.repository.update(id, input);
    if (!account) {
      throw new NotFoundException('Account not found.');
    }
    return account;
  }

  list(): Promise<AccountSummary[]> {
    return this.repository.list();
  }

  /**
   * Admins make other accounts Admins. An Admin cannot drop their own role, so
   * removing Admins one by one always leaves one. (Two Admins demoting each other
   * at the same moment could still leave none; that needs a database fix.)
   */
  async setAdmin(principal: Principal, id: string, isAdmin: boolean): Promise<AccountSummary> {
    if (id === principal.accountId && !isAdmin) {
      throw new BadRequestException('You cannot remove your own Admin role.');
    }
    const account = await this.repository.setAdmin(id, isAdmin);
    if (!account) {
      throw new NotFoundException('Account not found.');
    }
    return account;
  }
}
