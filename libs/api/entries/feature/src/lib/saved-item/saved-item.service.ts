import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SavedItemRepository } from '@menu/api/entries/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { ITEM_CATALOG, type ItemCatalog } from '@menu/api/shared/util-ports';
import { type SavedItem } from '@menu/shared/contracts';

@Injectable()
export class SavedItemService {
  constructor(
    private readonly repository: SavedItemRepository,
    @Inject(ITEM_CATALOG) private readonly catalog: ItemCatalog,
  ) {}

  /** Only an item on a menu now can be saved, so the list never holds one it cannot show. */
  async save(principal: Principal, itemId: string): Promise<SavedItem> {
    const item = await this.catalog.findForEntries(principal, itemId);
    if (!item?.acceptsEntry || !item.isPublic) {
      throw new NotFoundException('Item not found.');
    }
    return this.repository.save(principal.accountId, itemId);
  }

  remove(principal: Principal, itemId: string): Promise<void> {
    return this.repository.remove(principal.accountId, itemId);
  }
}
