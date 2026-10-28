import { Module } from '@nestjs/common';
import { EntryRepository } from '@menu/api/entries/data-access';
import { PHOTO_STORAGE, photoStorageFromEnv } from '@menu/api/shared/util-photos';
import { firebaseProjectId } from '@menu/api/shared/util-auth';
import { EntryPhotoController, PhotoController } from '../photo/photo.controller';
import { PhotoService } from '../photo/photo.service';
import { EntryMergeListener } from './entry-merge-listener';
import { EntryStats } from './entry-stats';
import { EntryController, ItemEntriesController, SharedEntryController } from './entry.controller';
import { EntryService } from './entry.service';

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
    { provide: PHOTO_STORAGE, useFactory: () => photoStorageFromEnv(firebaseProjectId()) },
  ],
  exports: [EntryMergeListener, EntryStats],
})
export class EntryModule {}
