import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '@menu/api/shared/util';
import { AdminOnly, CurrentPrincipal, type Principal } from '@menu/api/shared/util-auth';
import {
  type GrantOwnership,
  GrantOwnershipSchema,
  IdSchema,
  type Ownership,
  type OwnershipListQuery,
  OwnershipListQuerySchema,
  ownershipPath,
} from '@menu/shared/contracts';
import { OwnershipService } from './ownership.service';

@Controller(ownershipPath)
@AdminOnly()
export class OwnershipController {
  constructor(private readonly service: OwnershipService) {}

  @Get()
  list(
    @Query(new ZodValidationPipe(OwnershipListQuerySchema)) query: OwnershipListQuery,
  ): Promise<Ownership[]> {
    return this.service.listByVenue(query.venueId);
  }

  @Post()
  grant(
    @CurrentPrincipal() admin: Principal,
    @Body(new ZodValidationPipe(GrantOwnershipSchema)) input: GrantOwnership,
  ): Promise<Ownership> {
    return this.service.grant(admin, input);
  }

  @Delete(':venueId/:accountId')
  @HttpCode(204)
  revoke(
    @Param('venueId', new ZodValidationPipe(IdSchema)) venueId: string,
    @Param('accountId', new ZodValidationPipe(IdSchema)) accountId: string,
  ): Promise<void> {
    return this.service.revoke(accountId, venueId);
  }
}
