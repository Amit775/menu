import { Module } from '@nestjs/common';
import {
  ItemRepository,
  MenuSectionRepository,
  TagRepository,
  VenueRepository,
} from '@menu/api/menus/data-access';
import { firebaseProjectId } from '@menu/api/shared/util-auth';
import { PHOTO_STORAGE, photoStorageFromEnv } from '@menu/api/shared/util-photos';
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
  controllers: [VenueItemController, ItemController, ItemPhotoController, ItemPhotoReadController],
  providers: [
    ItemService,
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
