import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ZodValidationPipe } from '@menu/api/shared/util';
import {
  AdminOnly,
  Authenticated,
  CurrentPrincipal,
  type Principal,
} from '@menu/api/shared/util-auth';
import {
  accountPath,
  type ContributorApplication,
  type ContributorApplicationDecision,
  ContributorApplicationDecisionSchema,
  contributorApplicationPath,
  type ContributorApplicationReview,
  type CreateContributorApplication,
  CreateContributorApplicationSchema,
  IdSchema,
  type MyContributorApplication,
  myContributorApplicationPath,
} from '@menu/shared/contracts';
import { ContributorApplicationService } from './contributor-application.service';

@Controller(accountPath)
export class MyContributorApplicationController {
  constructor(private readonly service: ContributorApplicationService) {}

  @Get(myContributorApplicationPath)
  @Authenticated()
  mine(@CurrentPrincipal() principal: Principal): Promise<MyContributorApplication> {
    return this.service.mine(principal);
  }

  @Post(myContributorApplicationPath)
  @Authenticated()
  apply(
    @CurrentPrincipal() principal: Principal,
    @Body(new ZodValidationPipe(CreateContributorApplicationSchema))
    input: CreateContributorApplication,
  ): Promise<ContributorApplication> {
    return this.service.apply(principal, input.note);
  }
}

@Controller(contributorApplicationPath)
export class ContributorApplicationController {
  constructor(private readonly service: ContributorApplicationService) {}

  @Get()
  @AdminOnly()
  listPending(): Promise<ContributorApplicationReview[]> {
    return this.service.listPending();
  }

  @Post(':id/:decision')
  @HttpCode(200)
  @AdminOnly()
  decide(
    @CurrentPrincipal() principal: Principal,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Param('decision', new ZodValidationPipe(ContributorApplicationDecisionSchema))
    decision: ContributorApplicationDecision,
  ): Promise<ContributorApplicationReview> {
    return this.service.decide(principal, id, decision);
  }
}
