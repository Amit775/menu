import { Injectable } from '@nestjs/common';
import { EntryRepository } from '@menu/api/entries/data-access';
import { type ItemMergeListener } from '@menu/api/shared/util-ports';

@Injectable()
export class EntryMergeListener implements ItemMergeListener {
  constructor(private readonly repository: EntryRepository) {}

  onItemMerged(sourceItemId: string, targetItemId: string): Promise<void> {
    return this.repository.moveToItem(sourceItemId, targetItemId);
  }
}
