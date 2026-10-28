import { Injectable } from '@nestjs/common';
import { EntryRepository, SavedItemRepository } from '@menu/api/entries/data-access';
import { type ItemMergeListener } from '@menu/api/shared/util-ports';

@Injectable()
export class EntryMergeListener implements ItemMergeListener {
  constructor(
    private readonly repository: EntryRepository,
    private readonly saved: SavedItemRepository,
  ) {}

  async onItemMerged(sourceItemId: string, targetItemId: string): Promise<void> {
    await this.repository.moveToItem(sourceItemId, targetItemId);
    await this.saved.moveToItem(sourceItemId, targetItemId);
  }
}
