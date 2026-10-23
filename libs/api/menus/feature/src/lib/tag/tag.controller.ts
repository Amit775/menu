import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ZodValidationPipe } from '@menu/api/shared/util';
import { AdminOnly } from '@menu/api/shared/util-auth';
import {
  type CreateTag,
  CreateTagSchema,
  IdSchema,
  type Tag,
  tagPath,
  type UpdateTag,
  UpdateTagSchema,
} from '@menu/shared/contracts';
import { TagService } from './tag.service';

/** `/api/tags`: anyone reads the vocabulary; Admins edit it. */
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
}
