import { Module } from '@nestjs/common';
import { EntryRepository } from '@menu/api/entries/data-access';
import { EntryMergeListener } from './entry-merge-listener';
import { EntryController, ItemEntriesController, SharedEntryController } from './entry.controller';
import { EntryService } from './entry.service';

/** Needs `ITEM_CATALOG` and `AUTHOR_DIRECTORY` from the app's ports module. */
@Module({
  controllers: [ItemEntriesController, EntryController, SharedEntryController],
  providers: [EntryService, EntryRepository, EntryMergeListener],
  exports: [EntryMergeListener],
})
export class EntryModule {}
