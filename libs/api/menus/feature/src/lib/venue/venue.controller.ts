import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '@menu/api/shared/util';
import {
  AdminOnly,
  CurrentPrincipal,
  OptionalPrincipal,
  type Principal,
} from '@menu/api/shared/util-auth';
import {
  type CreateVenue,
  CreateVenueSchema,
  IdSchema,
  type UpdateVenue,
  UpdateVenueSchema,
  type Venue,
  type VenueListQuery,
  VenueListQuerySchema,
  venuePath,
} from '@menu/shared/contracts';
import { VenueService } from './venue.service';

@Controller(venuePath)
export class VenueController {
  constructor(private readonly service: VenueService) {}

  @Get()
  list(
    @OptionalPrincipal() principal: Principal | null,
    @Query(new ZodValidationPipe(VenueListQuerySchema)) query: VenueListQuery,
  ): Promise<Venue[]> {
    return this.service.list(principal, query);
  }

  @Get(':id')
  get(
    @OptionalPrincipal() principal: Principal | null,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
  ): Promise<Venue> {
    return this.service.get(principal, id);
  }

  @Post()
  @AdminOnly()
  create(
    @CurrentPrincipal() admin: Principal,
    @Body(new ZodValidationPipe(CreateVenueSchema)) input: CreateVenue,
  ): Promise<Venue> {
    return this.service.create(admin, input);
  }

  @Patch(':id')
  @AdminOnly()
  update(
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Body(new ZodValidationPipe(UpdateVenueSchema)) input: UpdateVenue,
  ): Promise<Venue> {
    return this.service.update(id, input);
  }
}
