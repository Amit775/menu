import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemRepository, TagRepository } from '@menu/api/menus/data-access';
import { type CreateTag, type Tag, type UpdateTag } from '@menu/shared/contracts';

/** The Admin-curated tag vocabulary. Users never create tags. */
@Injectable()
export class TagService {
  constructor(
    private readonly repository: TagRepository,
    private readonly items: ItemRepository,
  ) {}

  list(): Promise<Tag[]> {
    return this.repository.list();
  }

  async create(input: CreateTag): Promise<Tag> {
    const tag = await this.repository.create(input);
    if (!tag) {
      throw new ConflictException(`The tag "${input.slug}" already exists.`);
    }
    return tag;
  }

  async update(id: string, input: UpdateTag): Promise<Tag> {
    const tag = await this.repository.update(id, input);
    if (!tag) {
      throw new NotFoundException('Tag not found.');
    }
    return tag;
  }

  /** Folds a duplicate tag into another: its items get the target tag, then it is deleted. */
  async merge(id: string, intoTagId: string): Promise<void> {
    if (id === intoTagId) {
      throw new BadRequestException('A tag cannot be merged into itself.');
    }
    if (!(await this.items.tagsExist([id, intoTagId]))) {
      throw new NotFoundException('Tag not found.');
    }
    await this.items.mergeTag(id, intoTagId);
  }
}
