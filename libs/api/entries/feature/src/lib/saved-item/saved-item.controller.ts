import { Controller, Delete, HttpCode, Param, Put } from '@nestjs/common';
import { ZodValidationPipe } from '@menu/api/shared/util';
import { Authenticated, CurrentPrincipal, type Principal } from '@menu/api/shared/util-auth';
import { IdSchema, savedItemPath, type SavedItem } from '@menu/shared/contracts';
import { SavedItemService } from './saved-item.service';

@Controller(savedItemPath)
export class SavedItemController {
  constructor(private readonly service: SavedItemService) {}

  @Put(':itemId')
  @Authenticated()
  save(
    @CurrentPrincipal() principal: Principal,
    @Param('itemId', new ZodValidationPipe(IdSchema)) itemId: string,
  ): Promise<SavedItem> {
    return this.service.save(principal, itemId);
  }

  @Delete(':itemId')
  @HttpCode(204)
  @Authenticated()
  remove(
    @CurrentPrincipal() principal: Principal,
    @Param('itemId', new ZodValidationPipe(IdSchema)) itemId: string,
  ): Promise<void> {
    return this.service.remove(principal, itemId);
  }
}
