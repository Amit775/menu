import { Module } from '@nestjs/common';
import { ItemRepository, VenueRepository } from '@menu/api/menus/data-access';
import { ItemController, VenueItemController } from './item.controller';
import { ItemService } from './item.service';

@Module({
  controllers: [VenueItemController, ItemController],
  providers: [ItemService, ItemRepository, VenueRepository],
})
export class ItemModule {}
