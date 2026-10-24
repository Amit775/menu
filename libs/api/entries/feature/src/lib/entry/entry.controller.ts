import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ZodValidationPipe } from '@menu/api/shared/util';
import {
  AdminOnly,
  Authenticated,
  CurrentPrincipal,
  OptionalPrincipal,
  type Principal,
} from '@menu/api/shared/util-auth';
import {
  type CreateEntry,
  CreateEntrySchema,
  type DiaryQuery,
  DiaryQuerySchema,
  type Entry,
  type EntryWithItem,
  entryPath,
  IdSchema,
  type ItemEntries,
  itemEntriesRoute,
  type SetEntryHidden,
  SetEntryHiddenSchema,
  sharedEntryRoute,
  type SharedEntryView,
  ShareTokenSchema,
  type UpdateEntry,
  UpdateEntrySchema,
} from '@menu/shared/contracts';
import { EntryService } from './entry.service';

@Controller(itemEntriesRoute)
export class ItemEntriesController {
  constructor(private readonly service: EntryService) {}

  @Get()
  list(
    @OptionalPrincipal() principal: Principal | null,
    @Param('itemId', new ZodValidationPipe(IdSchema)) itemId: string,
  ): Promise<ItemEntries> {
    return this.service.listForItem(principal, itemId);
  }

  @Post()
  @Authenticated()
  create(
    @CurrentPrincipal() principal: Principal,
    @Param('itemId', new ZodValidationPipe(IdSchema)) itemId: string,
    @Body(new ZodValidationPipe(CreateEntrySchema)) input: CreateEntry,
  ): Promise<Entry> {
    return this.service.create(principal, itemId, input);
  }
}

@Controller(entryPath)
export class EntryController {
  constructor(private readonly service: EntryService) {}

  @Get()
  @Authenticated()
  diary(
    @CurrentPrincipal() principal: Principal,
    @Query(new ZodValidationPipe(DiaryQuerySchema)) query: DiaryQuery,
  ): Promise<EntryWithItem[]> {
    return this.service.diary(principal, query);
  }

  @Get(':id')
  @Authenticated()
  get(
    @CurrentPrincipal() principal: Principal,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
  ): Promise<Entry> {
    return this.service.get(principal, id);
  }

  @Patch(':id')
  @Authenticated()
  update(
    @CurrentPrincipal() principal: Principal,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Body(new ZodValidationPipe(UpdateEntrySchema)) input: UpdateEntry,
  ): Promise<Entry> {
    return this.service.update(principal, id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @Authenticated()
  remove(
    @CurrentPrincipal() principal: Principal,
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
  ): Promise<void> {
    return this.service.remove(principal, id);
  }

  @Put(':id/hidden')
  @HttpCode(204)
  @AdminOnly()
  setHidden(
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Body(new ZodValidationPipe(SetEntryHiddenSchema)) input: SetEntryHidden,
  ): Promise<void> {
    return this.service.setHidden(id, input.hidden);
  }
}

@Controller(sharedEntryRoute)
export class SharedEntryController {
  constructor(private readonly service: EntryService) {}

  @Get()
  get(
    @Param('token', new ZodValidationPipe(ShareTokenSchema)) token: string,
  ): Promise<SharedEntryView> {
    return this.service.shared(token);
  }
}
