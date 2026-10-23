import { Injectable } from '@nestjs/common';
import { ItemRepository, VenueRepository } from '@menu/api/menus/data-access';
import { canEditVenue, type Principal } from '@menu/api/shared/util-auth';
import { type EntryTarget, type ItemCatalog } from '@menu/api/shared/util-ports';
import { MenuItem } from './menu-item';

/** The menus side of the `ITEM_CATALOG` port: entries asks here before touching an item. */
@Injectable()
export class MenusItemCatalog implements ItemCatalog {
  constructor(
    private readonly repository: ItemRepository,
    private readonly venues: VenueRepository,
  ) {}

  async findForEntries(principal: Principal | null, itemId: string): Promise<EntryTarget | null> {
    const record = await this.repository.findById(itemId);
    const item = record ? new MenuItem(record) : null;
    if (!item?.isVisibleTo(principal)) {
      return null;
    }
    const venue = await this.venues.findById(item.record.venueId);
    if (!venue || (venue.status === 'hidden' && !canEditVenue(principal, venue.id))) {
      return null;
    }
    return {
      id: item.id,
      venueId: item.record.venueId,
      isPublic: item.state !== 'pending' && item.state !== 'rejected',
      acceptsEntry: principal !== null && item.acceptsEntryFrom(principal),
    };
  }
}
