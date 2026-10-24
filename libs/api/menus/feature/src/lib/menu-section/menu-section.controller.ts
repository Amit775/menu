import { Body, Controller, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { ZodValidationPipe } from '@menu/api/shared/util';
import {
  Authenticated,
  CurrentPrincipal,
  OptionalPrincipal,
  type Principal,
} from '@menu/api/shared/util-auth';
import {
  type CreateMenuSection,
  CreateMenuSectionSchema,
  IdSchema,
  menuSectionRoute,
  type MenuSection,
  type ReorderMenuSections,
  ReorderMenuSectionsSchema,
  type UpdateMenuSection,
  UpdateMenuSectionSchema,
} from '@menu/shared/contracts';
import { MenuSectionService } from './menu-section.service';

@Controller(menuSectionRoute)
export class MenuSectionController {
  constructor(private readonly service: MenuSectionService) {}

  @Get()
  list(
    @OptionalPrincipal() principal: Principal | null,
    @Param('venueId', new ZodValidationPipe(IdSchema)) venueId: string,
  ): Promise<MenuSection[]> {
    return this.service.list(principal, venueId);
  }

  @Post()
  @Authenticated()
  create(
    @CurrentPrincipal() principal: Principal,
    @Param('venueId', new ZodValidationPipe(IdSchema)) venueId: string,
    @Body(new ZodValidationPipe(CreateMenuSectionSchema)) input: CreateMenuSection,
  ): Promise<MenuSection> {
    return this.service.create(principal, venueId, input.name);
  }

  @Put('order')
  @Authenticated()
  reorder(
    @CurrentPrincipal() principal: Principal,
    @Param('venueId', new ZodValidationPipe(IdSchema)) venueId: string,
    @Body(new ZodValidationPipe(ReorderMenuSectionsSchema)) input: ReorderMenuSections,
  ): Promise<MenuSection[]> {
    return this.service.reorder(principal, venueId, input.sectionIds);
  }

  @Patch(':id')
  @Authenticated()
  rename(
    @CurrentPrincipal() principal: Principal,
    @Param('venueId', new ZodValidationPipe(IdSchema)) venueId: string,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Body(new ZodValidationPipe(UpdateMenuSectionSchema)) input: UpdateMenuSection,
  ): Promise<MenuSection> {
    return this.service.rename(principal, venueId, id, input.name);
  }
}
