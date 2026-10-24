import { Injectable } from '@nestjs/common';
import { ItemRepository, VenueRepository } from '@menu/api/menus/data-access';
import { canEditVenue, type Principal } from '@menu/api/shared/util-auth';
import { type EntryTarget, type ItemCatalog } from '@menu/api/shared/util-ports';
import { type ItemRef } from '@menu/shared/contracts';
import { MenuItem } from './menu-item';

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

  async refsFor(itemIds: readonly string[]): Promise<ReadonlyMap<string, ItemRef>> {
    const items = await this.repository.findByIds([...new Set(itemIds)]);
    const venueIds = [...new Set(items.map((item) => item.venueId))];
    const venues =
      venueIds.length > 0 ? await this.venues.list({ ids: venueIds, includeHidden: true }) : [];
    const venueNames = new Map(venues.map((venue) => [venue.id, venue.name]));
    const refs = new Map<string, ItemRef>();
    for (const item of items) {
      const venueName = venueNames.get(item.venueId);
      if (venueName) {
        refs.set(item.id, {
          id: item.id,
          name: item.name,
          listPrice: item.listPrice,
          venue: { id: item.venueId, name: venueName },
        });
      }
    }
    return refs;
  }
}
