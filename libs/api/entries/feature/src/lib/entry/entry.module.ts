import { Module } from '@nestjs/common';
import { EntryRepository, SavedItemRepository } from '@menu/api/entries/data-access';
import { PHOTO_STORAGE, photoStorageFromEnv } from '@menu/api/shared/util-photos';
import { firebaseProjectId } from '@menu/api/shared/util-auth';
import { EntryPhotoController, PhotoController } from '../photo/photo.controller';
import { PhotoService } from '../photo/photo.service';
import { SavedItemController } from '../saved-item/saved-item.controller';
import { SharePreviewService } from '../share-preview/share-preview.service';
import { SharedEntryLinkController } from '../share-preview/shared-entry-link.controller';
import { WEB_FETCH, WebShell } from '../share-preview/web-shell';
import { SavedItemService } from '../saved-item/saved-item.service';
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
    SavedItemController,
    SharedEntryLinkController,
  ],
  providers: [
    EntryService,
    EntryRepository,
    SavedItemRepository,
    SavedItemService,
    EntryMergeListener,
    EntryStats,
    PhotoService,
    WebShell,
    SharePreviewService,
    { provide: WEB_FETCH, useValue: (url: string, init: RequestInit) => fetch(url, init) },
    { provide: PHOTO_STORAGE, useFactory: () => photoStorageFromEnv(firebaseProjectId()) },
  ],
  exports: [EntryMergeListener, EntryStats],
})
export class EntryModule {}
