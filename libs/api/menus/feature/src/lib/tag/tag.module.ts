import { Module } from '@nestjs/common';
import { ItemRepository, TagRepository } from '@menu/api/menus/data-access';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';

@Module({
  controllers: [TagController],
  providers: [TagService, TagRepository, ItemRepository],
})
export class TagModule {}
