import { Injectable } from '@nestjs/common';
import { EntryRepository, SavedItemRepository } from '@menu/api/entries/data-access';
import { type EntryStatsSource, type ItemEntryStats } from '@menu/api/shared/util-ports';
import { summarizeByItem } from './item-stats';

@Injectable()
export class EntryStats implements EntryStatsSource {
  constructor(
    private readonly repository: EntryRepository,
    private readonly saved: SavedItemRepository,
  ) {}

  async statsByItem(): Promise<ReadonlyMap<string, ItemEntryStats>> {
    return summarizeByItem(await this.repository.listFacts());
  }

  itemIdsWrittenBy(authorId: string): Promise<ReadonlySet<string>> {
    return this.repository.itemIdsWrittenBy(authorId);
  }

  itemIdsSavedBy(accountId: string): Promise<readonly string[]> {
    return this.saved.itemIdsSavedBy(accountId);
  }

  countEntriesAt(authorId: string, venueId: string): Promise<number> {
    return this.repository.countByAuthorAtVenue(authorId, venueId);
  }
}
