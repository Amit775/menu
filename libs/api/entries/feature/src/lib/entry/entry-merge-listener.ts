import { Injectable } from '@nestjs/common';
import { EntryRepository } from '@menu/api/entries/data-access';
import { type ItemMergeListener } from '@menu/api/shared/util-ports';

/** The entries side of the `ITEM_MERGE_LISTENER` port: entries follow a merged item. Idempotent. */
@Injectable()
export class EntryMergeListener implements ItemMergeListener {
  constructor(private readonly repository: EntryRepository) {}

  onItemMerged(sourceItemId: string, targetItemId: string): Promise<void> {
    return this.repository.moveToItem(sourceItemId, targetItemId);
  }
}
