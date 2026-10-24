import { Module } from '@nestjs/common';
import { EntryRepository, PHOTO_STORAGE, photoStorageFromEnv } from '@menu/api/entries/data-access';
import { firebaseProjectId } from '@menu/api/shared/util-auth';
import { EntryPhotoController, PhotoController } from '../photo/photo.controller';
import { PhotoService } from '../photo/photo.service';
import { EntryMergeListener } from './entry-merge-listener';
import { EntryStats } from './entry-stats';
import { EntryController, ItemEntriesController, SharedEntryController } from './entry.controller';
import { EntryService } from './entry.service';

/** Needs `ITEM_CATALOG` and `AUTHOR_DIRECTORY` from the app's ports module. */
@Module({
  controllers: [
    ItemEntriesController,
    EntryController,
    SharedEntryController,
    EntryPhotoController,
    PhotoController,
  ],
  providers: [
    EntryService,
    EntryRepository,
    EntryMergeListener,
    EntryStats,
    PhotoService,
    // PHOTO_DIR (local, e2e) or the Firebase Storage bucket (ADR 0011).
    { provide: PHOTO_STORAGE, useFactory: () => photoStorageFromEnv(firebaseProjectId()) },
  ],
  exports: [EntryMergeListener, EntryStats],
})
export class EntryModule {}
