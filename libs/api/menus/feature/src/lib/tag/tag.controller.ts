import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ZodValidationPipe } from '@menu/api/shared/util';
import { AdminOnly } from '@menu/api/shared/util-auth';
import {
  type CreateTag,
  CreateTagSchema,
  IdSchema,
  type MergeTag,
  MergeTagSchema,
  type Tag,
  tagPath,
  type UpdateTag,
  UpdateTagSchema,
} from '@menu/shared/contracts';
import { TagService } from './tag.service';

@Controller(tagPath)
export class TagController {
  constructor(private readonly service: TagService) {}

  @Get()
  list(): Promise<Tag[]> {
    return this.service.list();
  }

  @Post()
  @AdminOnly()
  create(@Body(new ZodValidationPipe(CreateTagSchema)) input: CreateTag): Promise<Tag> {
    return this.service.create(input);
  }

  @Patch(':id')
  @AdminOnly()
  update(
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Body(new ZodValidationPipe(UpdateTagSchema)) input: UpdateTag,
  ): Promise<Tag> {
    return this.service.update(id, input);
  }

  @Post(':id/merge')
  @HttpCode(204)
  @AdminOnly()
  merge(
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Body(new ZodValidationPipe(MergeTagSchema)) input: MergeTag,
  ): Promise<void> {
    return this.service.merge(id, input.intoTagId);
  }
}
