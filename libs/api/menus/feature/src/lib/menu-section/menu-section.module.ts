import { Module } from '@nestjs/common';
import { MenuSectionRepository, VenueRepository } from '@menu/api/menus/data-access';
import { MenuSectionController } from './menu-section.controller';
import { MenuSectionService } from './menu-section.service';

@Module({
  controllers: [MenuSectionController],
  providers: [MenuSectionService, MenuSectionRepository, VenueRepository],
})
export class MenuSectionModule {}
