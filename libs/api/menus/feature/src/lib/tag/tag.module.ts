import { Module } from '@nestjs/common';
import { TagRepository } from '@menu/api/menus/data-access';
import { TagController } from './tag.controller';
import { TagService } from './tag.service';

@Module({
  controllers: [TagController],
  providers: [TagService, TagRepository],
})
export class TagModule {}
