import { Injectable, NotFoundException } from '@nestjs/common';
import { VenueRepository } from '@menu/api/menus/data-access';
import { canEditVenue, type Principal } from '@menu/api/shared/util-auth';
import {
  type CreateVenue,
  type UpdateVenue,
  type Venue,
  type VenueListQuery,
} from '@menu/shared/contracts';

/**
 * Venues. Only Admins create and edit them (enforced by the controller). A hidden
 * venue is visible only to those who can edit it.
 */
@Injectable()
export class VenueService {
  constructor(private readonly repository: VenueRepository) {}

  list(principal: Principal | null, query: VenueListQuery): Promise<Venue[]> {
    if (query.owned) {
      if (!principal) {
        return Promise.resolve([]);
      }
      // An Admin's "my venues" is every venue.
      return this.repository.list({
        ...(principal.isAdmin ? {} : { ids: principal.ownedVenueIds }),
        includeHidden: true,
      });
    }
    return this.repository.list({ includeHidden: principal?.isAdmin ?? false });
  }

  async get(principal: Principal | null, id: string): Promise<Venue> {
    const venue = await this.repository.findById(id);
    if (!venue || (venue.status === 'hidden' && !canEditVenue(principal, id))) {
      throw new NotFoundException('Venue not found.');
    }
    return venue;
  }

  create(admin: Principal, input: CreateVenue): Promise<Venue> {
    return this.repository.create(input, admin.accountId);
  }

  async update(id: string, input: UpdateVenue): Promise<Venue> {
    const venue = await this.repository.update(id, input);
    if (!venue) {
      throw new NotFoundException('Venue not found.');
    }
    return venue;
  }
}
