import { Module } from '@nestjs/common';
import { ContributorApplicationRepository } from '@menu/api/users/data-access';
import {
  ContributorApplicationController,
  MyContributorApplicationController,
} from './contributor-application.controller';
import { ContributorApplicationService } from './contributor-application.service';

@Module({
  controllers: [MyContributorApplicationController, ContributorApplicationController],
  providers: [ContributorApplicationService, ContributorApplicationRepository],
})
export class ContributorApplicationModule {}
