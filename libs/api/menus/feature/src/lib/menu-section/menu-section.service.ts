import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MenuSectionRepository, VenueRepository } from '@menu/api/menus/data-access';
import { canEditVenue, type Principal } from '@menu/api/shared/util-auth';
import { type LocalizedText, type MenuSection } from '@menu/shared/contracts';

@Injectable()
export class MenuSectionService {
  constructor(
    private readonly repository: MenuSectionRepository,
    private readonly venues: VenueRepository,
  ) {}

  async list(principal: Principal | null, venueId: string): Promise<MenuSection[]> {
    const venue = await this.venues.findById(venueId);
    if (!venue || (venue.status === 'hidden' && !canEditVenue(principal, venueId))) {
      throw new NotFoundException('Venue not found.');
    }
    return this.repository.listByVenue(venueId);
  }

  async create(principal: Principal, venueId: string, name: LocalizedText): Promise<MenuSection> {
    await this.assertCanEdit(principal, venueId);
    return this.repository.create(venueId, name);
  }

  async rename(
    principal: Principal,
    venueId: string,
    id: string,
    name: LocalizedText,
  ): Promise<MenuSection> {
    await this.assertCanEdit(principal, venueId);
    const section = await this.repository.rename(venueId, id, name);
    if (!section) {
      throw new NotFoundException('Section not found.');
    }
    return section;
  }

  async reorder(
    principal: Principal,
    venueId: string,
    sectionIds: readonly string[],
  ): Promise<MenuSection[]> {
    await this.assertCanEdit(principal, venueId);
    const current = (await this.repository.listByVenue(venueId)).map((section) => section.id);
    const sameSet =
      current.length === sectionIds.length &&
      new Set(sectionIds).size === sectionIds.length &&
      sectionIds.every((id) => current.includes(id));
    if (!sameSet) {
      throw new BadRequestException('List every section of the venue exactly once.');
    }
    return this.repository.reorder(venueId, sectionIds);
  }

  private async assertCanEdit(principal: Principal, venueId: string): Promise<void> {
    if (!canEditVenue(principal, venueId)) {
      throw new ForbiddenException('Only the venue’s Owner or an Admin can edit its menu.');
    }
    if (!(await this.venues.findById(venueId))) {
      throw new NotFoundException('Venue not found.');
    }
  }
}
