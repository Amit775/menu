import { Injectable } from '@nestjs/common';
import { isPrismaError, PrismaErrorCode, PrismaService, readText } from '@menu/api/shared/db';
import { withoutUndefined } from '@menu/api/shared/util';
import {
  ItemVariationsSchema,
  type CreateTag,
  type Tag,
  type TagKind,
  TagKindSchema,
  type UpdateTag,
} from '@menu/shared/contracts';

interface TagRow {
  id: string;
  slug: string;
  name: unknown;
  kind: TagKind;
}

@Injectable()
export class TagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<Tag[]> {
    const rows = await this.prisma.tag.findMany();
    const kinds = TagKindSchema.options;
    return rows
      .map(toContract)
      .sort(
        (a, b) =>
          kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || a.name.he.localeCompare(b.name.he, 'he'),
      );
  }

  async create(input: CreateTag): Promise<Tag | null> {
    try {
      const row = await this.prisma.tag.create({
        data: { slug: input.slug, kind: input.kind, name: input.name },
      });
      return toContract(row);
    } catch (error) {
      if (isPrismaError(error, PrismaErrorCode.UniqueViolation)) {
        return null;
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateTag): Promise<Tag | null> {
    const { count } = await this.prisma.tag.updateMany({
      where: { id },
      data: withoutUndefined({ kind: input.kind, name: input.name }),
    });
    if (count === 0) {
      return null;
    }
    return toContract(await this.prisma.tag.findUniqueOrThrow({ where: { id } }));
  }

  /**
   * Re-points every item from one tag to another, then deletes the old tag, in
   * one transaction. An item that had both keeps the better (earlier) position, so
   * a merged primary tag stays primary. False when either tag is missing.
   */
  async merge(fromTagId: string, intoTagId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const tags = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "tag" WHERE "id" IN (${fromTagId}::uuid, ${intoTagId}::uuid) FOR UPDATE`;
      if (tags.length !== 2) {
        return false;
      }
      const items = await tx.item.findMany({
        where: {
          OR: [
            { tagIds: { has: fromTagId } },
            { variations: { array_contains: [{ tagIds: [fromTagId] }] } },
          ],
        },
        select: { id: true, tagIds: true, variations: true },
      });
      const repoint = (ids: readonly string[]) => [
        ...new Set(ids.map((id) => (id === fromTagId ? intoTagId : id))),
      ];
      for (const item of items) {
        const variations = ItemVariationsSchema.parse(item.variations).map((variation) => ({
          ...variation,
          tagIds: repoint(variation.tagIds),
        }));
        await tx.item.update({
          where: { id: item.id },
          data: { tagIds: repoint(item.tagIds), variations },
        });
      }
      await tx.tag.delete({ where: { id: fromTagId } });
      return true;
    });
  }
}

function toContract(row: TagRow): Tag {
  return { id: row.id, slug: row.slug, name: readText(row.name), kind: row.kind };
}
