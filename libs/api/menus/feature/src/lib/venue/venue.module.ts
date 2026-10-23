import { Module } from '@nestjs/common';
import { VenueRepository } from '@menu/api/menus/data-access';
import { VenueController } from './venue.controller';
import { VenueService } from './venue.service';

@Module({
  controllers: [VenueController],
  providers: [VenueService, VenueRepository],
})
export class VenueModule {}
