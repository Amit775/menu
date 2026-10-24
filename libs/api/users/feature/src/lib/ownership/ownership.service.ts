import { Injectable, NotFoundException } from '@nestjs/common';
import { OwnershipRepository } from '@menu/api/users/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { type GrantOwnership, type Ownership } from '@menu/shared/contracts';

@Injectable()
export class OwnershipService {
  constructor(private readonly repository: OwnershipRepository) {}

  listByVenue(venueId: string): Promise<Ownership[]> {
    return this.repository.listByVenue(venueId);
  }

  async grant(admin: Principal, input: GrantOwnership): Promise<Ownership> {
    const ownership = await this.repository.grant(input, admin.accountId);
    if (!ownership) {
      throw new NotFoundException('Account or venue not found.');
    }
    return ownership;
  }

  async revoke(accountId: string, venueId: string): Promise<void> {
    if (!(await this.repository.revoke(accountId, venueId))) {
      throw new NotFoundException('That account does not own this venue.');
    }
  }
}
