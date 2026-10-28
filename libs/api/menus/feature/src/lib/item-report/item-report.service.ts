import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemReportRepository, ItemRepository, VenueRepository } from '@menu/api/menus/data-access';
import { canEditVenue, type Principal } from '@menu/api/shared/util-auth';
import { type CreateItemReport, type ItemReportSummary } from '@menu/shared/contracts';
import { MenuItem } from '../item/menu-item';

@Injectable()
export class ItemReportService {
  constructor(
    private readonly reports: ItemReportRepository,
    private readonly items: ItemRepository,
    private readonly venues: VenueRepository,
  ) {}

  async report(principal: Principal, itemId: string, input: CreateItemReport): Promise<void> {
    const item = await this.findVisible(principal, itemId);
    if (item.state !== 'approved') {
      throw new ConflictException('This item is not on the menu.');
    }
    const filed = await this.reports.report({
      itemId,
      reporterId: principal.accountId,
      kind: input.kind,
      price: input.kind === 'price' ? input.price : null,
    });
    if (!filed) {
      throw new ConflictException('This item is not on the menu.');
    }
  }

  async listForVenue(principal: Principal, venueId: string): Promise<ItemReportSummary[]> {
    if (!canEditVenue(principal, venueId)) {
      throw new ForbiddenException('Only the venue’s Owner or an Admin sees its reports.');
    }
    return this.reports.summariesForVenue(venueId);
  }

  async confirm(principal: Principal, itemId: string): Promise<void> {
    const item = await this.findVisible(principal, itemId);
    if (!item.canBeDecidedBy(principal)) {
      throw new ForbiddenException('Only the venue’s Owner or an Admin confirms its menu.');
    }
    if (!(await this.items.confirm(itemId, principal.accountId))) {
      throw new ConflictException('This item is not on the menu.');
    }
  }

  private async findVisible(principal: Principal, itemId: string): Promise<MenuItem> {
    const record = await this.items.findById(itemId);
    const item = record ? new MenuItem(record) : null;
    if (!item?.isVisibleTo(principal)) {
      throw new NotFoundException('Item not found.');
    }
    const venue = await this.venues.findById(item.record.venueId);
    if (!venue || (venue.status === 'hidden' && !canEditVenue(principal, venue.id))) {
      throw new NotFoundException('Item not found.');
    }
    return item;
  }
}
