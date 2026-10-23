import { Module } from '@nestjs/common';
import { DiscoverRepository } from '@menu/api/discover/data-access';
import { DiscoverController } from './discover.controller';
import { DiscoverService, RANKING_STRATEGY } from './discover.service';
import { ConfidenceWeightedRanking } from './ranking';

@Module({
  controllers: [DiscoverController],
  providers: [
    DiscoverService,
    DiscoverRepository,
    { provide: RANKING_STRATEGY, useValue: new ConfidenceWeightedRanking() },
  ],
})
export class DiscoverModule {}
