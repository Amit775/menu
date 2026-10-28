import { Module } from '@nestjs/common';
import {
  ItemReportRepository,
  ItemRepository,
  MenuSectionRepository,
  TagRepository,
  VenueRepository,
} from '@menu/api/menus/data-access';
import { firebaseProjectId } from '@menu/api/shared/util-auth';
import { PHOTO_STORAGE, photoStorageFromEnv } from '@menu/api/shared/util-photos';
import {
  ItemReportController,
  VenueItemReportController,
} from '../item-report/item-report.controller';
import { ItemReportService } from '../item-report/item-report.service';
import { MenusItemCatalog } from './item-catalog';
import { ItemPhotoService } from './item-photo.service';
import {
  ItemController,
  ItemPhotoController,
  ItemPhotoReadController,
  VenueItemController,
} from './item.controller';
import { ItemService } from './item.service';

@Module({
  // ItemReportController comes before ItemController, whose `:id/:decision` would otherwise take `:id/reports`.
  controllers: [
    ItemReportController,
    VenueItemReportController,
    VenueItemController,
    ItemController,
    ItemPhotoController,
    ItemPhotoReadController,
  ],
  providers: [
    ItemService,
    ItemReportService,
    ItemReportRepository,
    ItemPhotoService,
    { provide: PHOTO_STORAGE, useFactory: () => photoStorageFromEnv(firebaseProjectId()) },
    ItemRepository,
    VenueRepository,
    MenuSectionRepository,
    TagRepository,
    MenusItemCatalog,
  ],
  exports: [MenusItemCatalog],
})
export class ItemModule {}
