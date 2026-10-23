import { Module } from '@nestjs/common';
import {
  ItemRepository,
  MenuSectionRepository,
  TagRepository,
  VenueRepository,
} from '@menu/api/menus/data-access';
import { MenusItemCatalog } from './item-catalog';
import { ItemController, VenueItemController } from './item.controller';
import { ItemService } from './item.service';

@Module({
  controllers: [VenueItemController, ItemController],
  providers: [
    ItemService,
    ItemRepository,
    VenueRepository,
    MenuSectionRepository,
    TagRepository,
    MenusItemCatalog,
  ],
  exports: [MenusItemCatalog],
})
export class ItemModule {}
