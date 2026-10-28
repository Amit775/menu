import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ZodValidationPipe } from '@menu/api/shared/util';
import { Authenticated, CurrentPrincipal, type Principal } from '@menu/api/shared/util-auth';
import {
  type CreateItemReport,
  CreateItemReportSchema,
  IdSchema,
  itemPath,
  type ItemReportSummary,
  venueItemReportsRoute,
} from '@menu/shared/contracts';
import { ItemReportService } from './item-report.service';

@Controller(itemPath)
export class ItemReportController {
  constructor(private readonly service: ItemReportService) {}

  @Post(':id/reports')
  @HttpCode(204)
  @Authenticated()
  report(
    @CurrentPrincipal() principal: Principal,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Body(new ZodValidationPipe(CreateItemReportSchema)) input: CreateItemReport,
  ): Promise<void> {
    return this.service.report(principal, id, input);
  }

  /** "Still on the menu": closes the item's reports. Archiving or editing the price closes them too. */
  @Delete(':id/reports')
  @HttpCode(204)
  @Authenticated()
  confirm(
    @CurrentPrincipal() principal: Principal,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
  ): Promise<void> {
    return this.service.confirm(principal, id);
  }
}

@Controller(venueItemReportsRoute)
export class VenueItemReportController {
  constructor(private readonly service: ItemReportService) {}

  @Get()
  @Authenticated()
  list(
    @CurrentPrincipal() principal: Principal,
    @Param('venueId', new ZodValidationPipe(IdSchema)) venueId: string,
  ): Promise<ItemReportSummary[]> {
    return this.service.listForVenue(principal, venueId);
  }
}
