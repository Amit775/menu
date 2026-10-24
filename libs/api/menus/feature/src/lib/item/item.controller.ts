import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ZodValidationPipe } from '@menu/api/shared/util';
import {
  Authenticated,
  CurrentPrincipal,
  OptionalPrincipal,
  type Principal,
} from '@menu/api/shared/util-auth';
import {
  type CreateItem,
  CreateItemSchema,
  IdSchema,
  type Item,
  type ItemDecision,
  ItemDecisionSchema,
  itemPath,
  type MergeItem,
  MergeItemSchema,
  type UpdateItem,
  UpdateItemSchema,
  venueItemsRoute,
} from '@menu/shared/contracts';
import { ItemService } from './item.service';

@Controller(venueItemsRoute)
export class VenueItemController {
  constructor(private readonly service: ItemService) {}

  @Get()
  list(
    @OptionalPrincipal() principal: Principal | null,
    @Param('venueId', new ZodValidationPipe(IdSchema)) venueId: string,
  ): Promise<Item[]> {
    return this.service.listByVenue(principal, venueId);
  }

  @Post()
  @Authenticated()
  create(
    @CurrentPrincipal() principal: Principal,
    @Param('venueId', new ZodValidationPipe(IdSchema)) venueId: string,
    @Body(new ZodValidationPipe(CreateItemSchema)) input: CreateItem,
  ): Promise<Item> {
    return this.service.create(principal, venueId, input);
  }
}

@Controller(itemPath)
export class ItemController {
  constructor(private readonly service: ItemService) {}

  @Get('pending')
  @Authenticated()
  pending(@CurrentPrincipal() principal: Principal): Promise<Item[]> {
    return this.service.listPending(principal);
  }

  @Get(':id')
  get(
    @OptionalPrincipal() principal: Principal | null,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
  ): Promise<Item> {
    return this.service.get(principal, id);
  }

  @Patch(':id')
  @Authenticated()
  update(
    @CurrentPrincipal() principal: Principal,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Body(new ZodValidationPipe(UpdateItemSchema)) input: UpdateItem,
  ): Promise<Item> {
    return this.service.update(principal, id, input);
  }

  // Declared before `:id/:decision` so `merge` is not read as a decision.
  @Post(':id/merge')
  @HttpCode(200)
  @Authenticated()
  merge(
    @CurrentPrincipal() principal: Principal,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Body(new ZodValidationPipe(MergeItemSchema)) input: MergeItem,
  ): Promise<Item> {
    return this.service.merge(principal, id, input.intoItemId);
  }

  @Post(':id/:decision')
  @HttpCode(200)
  @Authenticated()
  decide(
    @CurrentPrincipal() principal: Principal,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Param('decision', new ZodValidationPipe(ItemDecisionSchema)) decision: ItemDecision,
  ): Promise<Item> {
    return this.service.decide(principal, id, decision);
  }
}
