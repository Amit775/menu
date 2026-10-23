import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  type ItemRecord,
  ItemRepository,
  MenuSectionRepository,
  TagRepository,
  VenueRepository,
} from '@menu/api/menus/data-access';
import { canEditVenue, type Principal } from '@menu/api/shared/util-auth';
import { ITEM_MERGE_LISTENER, type ItemMergeListener } from '@menu/api/shared/util-ports';
import {
  type CreateItem,
  type Item,
  type ItemDecision,
  type ItemState,
  type UpdateItem,
} from '@menu/shared/contracts';
import { MenuItem } from './menu-item';

const decisionTarget: Record<ItemDecision, ItemState> = {
  approve: 'approved',
  reject: 'rejected',
  archive: 'archived',
};

/**
 * Items and their lifecycle. Owners and Admins add items straight to the menu;
 * anyone else submits a missing item, which stays pending until an approver
 * approves, rejects or merges it.
 */
@Injectable()
export class ItemService {
  constructor(
    private readonly repository: ItemRepository,
    private readonly venues: VenueRepository,
    private readonly sections: MenuSectionRepository,
    private readonly tags: TagRepository,
    @Optional()
    @Inject(ITEM_MERGE_LISTENER)
    private readonly mergeListener: ItemMergeListener | null = null,
  ) {}

  /** The menu: approved items, plus pending ones for approvers, plus the caller's own submissions. */
  async listByVenue(principal: Principal | null, venueId: string): Promise<Item[]> {
    await this.assertVenueVisible(principal, venueId);
    const states: ItemState[] = canEditVenue(principal, venueId)
      ? ['approved', 'pending']
      : ['approved'];
    const records = await this.repository.listByVenue(
      venueId,
      states,
      principal?.accountId ?? null,
    );
    return records.map((record) => new MenuItem(record).toContract(principal));
  }

  /** Pending submissions the caller can decide on: an Owner's venues, or every venue for an Admin. */
  async listPending(principal: Principal): Promise<Item[]> {
    const records = await this.repository.listPending(
      principal.isAdmin ? null : principal.ownedVenueIds,
    );
    return records.map((record) => new MenuItem(record).toContract(principal));
  }

  async get(principal: Principal | null, id: string): Promise<Item> {
    return (await this.findVisible(principal, id)).toContract(principal);
  }

  async create(principal: Principal, venueId: string, input: CreateItem): Promise<Item> {
    await this.assertVenueVisible(principal, venueId);
    await this.assertReferences(venueId, input.sectionId, input.tagIds);
    const approver = canEditVenue(principal, venueId);
    const record = await this.repository.create({
      venueId,
      ...input,
      state: approver ? 'approved' : 'pending',
      submittedById: approver ? null : principal.accountId,
    });
    return new MenuItem(record).toContract(principal);
  }

  async update(principal: Principal, id: string, input: UpdateItem): Promise<Item> {
    const item = await this.findVisible(principal, id);
    item.assertEditableBy(principal);
    await this.assertReferences(item.record.venueId, input.sectionId, input.tagIds);
    const record = await this.repository.update(id, input);
    if (!record) {
      throw new NotFoundException('Item not found.');
    }
    return new MenuItem(record).toContract(principal);
  }

  async decide(principal: Principal, id: string, decision: ItemDecision): Promise<Item> {
    const item = await this.findVisible(principal, id);
    const from = item.assertDecision(principal, decision);
    const record = await this.transition(id, from, decisionTarget[decision]);
    return new MenuItem(record).toContract(principal);
  }

  /**
   * Marks a pending item as a duplicate of an approved one, then tells entries to
   * follow it. If the listener fails, the same request again re-runs it (the
   * listener is idempotent), so a half-done merge can be completed.
   */
  async merge(principal: Principal, id: string, intoItemId: string): Promise<Item> {
    if (id === intoItemId) {
      throw new BadRequestException('An item cannot be merged into itself.');
    }
    const item = await this.findVisible(principal, id);
    if (
      item.state === 'merged' &&
      item.record.mergedIntoId === intoItemId &&
      item.canBeEditedBy(principal)
    ) {
      await this.mergeListener?.onItemMerged(id, intoItemId);
      return item.toContract(principal);
    }
    const from = item.assertDecision(principal, 'merge');
    const target = await this.findVisible(principal, intoItemId);
    item.assertCanMergeInto(target);
    const record = await this.transition(id, from, 'merged', intoItemId);
    await this.mergeListener?.onItemMerged(id, intoItemId);
    return new MenuItem(record).toContract(principal);
  }

  private async transition(
    id: string,
    from: ItemState,
    to: ItemState,
    mergedIntoId: string | null = null,
  ): Promise<ItemRecord> {
    const record = await this.repository.transition(id, from, to, mergedIntoId);
    if (!record) {
      throw new ConflictException('The item changed meanwhile. Reload and try again.');
    }
    return record;
  }

  private async findVisible(principal: Principal | null, id: string): Promise<MenuItem> {
    const record = await this.repository.findById(id);
    const item = record ? new MenuItem(record) : null;
    if (!item?.isVisibleTo(principal)) {
      throw new NotFoundException('Item not found.');
    }
    await this.assertVenueVisible(principal, item.record.venueId);
    return item;
  }

  private async assertVenueVisible(principal: Principal | null, venueId: string): Promise<void> {
    const venue = await this.venues.findById(venueId);
    if (!venue || (venue.status === 'hidden' && !canEditVenue(principal, venueId))) {
      throw new NotFoundException('Venue not found.');
    }
  }

  private async assertReferences(
    venueId: string,
    sectionId: string | undefined,
    tagIds: readonly string[] | undefined,
  ): Promise<void> {
    if (sectionId && !(await this.sections.belongsTo(sectionId, venueId))) {
      throw new BadRequestException('The section is not on this venue’s menu.');
    }
    if (tagIds?.length && !(await this.tags.allExist(tagIds))) {
      throw new BadRequestException('Unknown tag.');
    }
  }
}
