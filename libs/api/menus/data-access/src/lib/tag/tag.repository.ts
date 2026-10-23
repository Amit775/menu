import { Injectable } from '@nestjs/common';
import {
  fromLocalized,
  isPrismaError,
  PrismaErrorCode,
  PrismaService,
  toLocalized,
} from '@menu/api/shared/db';
import { withoutUndefined } from '@menu/api/shared/util';
import { type CreateTag, type Tag, type TagKind, type UpdateTag } from '@menu/shared/contracts';

interface TagRow {
  id: string;
  slug: string;
  nameHe: string;
  nameEn: string | null;
  kind: TagKind;
}

/**
 * Maps between Prisma rows and the shared contract. The only code that touches
 * `prisma.tag`; it also re-points `item_tag` links when tags merge.
 */
@Injectable()
export class TagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<Tag[]> {
    const rows = await this.prisma.tag.findMany({ orderBy: [{ kind: 'asc' }, { nameHe: 'asc' }] });
    return rows.map(toContract);
  }

  async allExist(ids: readonly string[]): Promise<boolean> {
    return (await this.prisma.tag.count({ where: { id: { in: [...ids] } } })) === new Set(ids).size;
  }

  /** Null when the slug is taken. */
  async create(input: CreateTag): Promise<Tag | null> {
    try {
      const row = await this.prisma.tag.create({
        data: { slug: input.slug, kind: input.kind, ...fromLocalized(input.name) },
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
      data: withoutUndefined({
        kind: input.kind,
        ...(input.name ? fromLocalized(input.name) : {}),
      }),
    });
    if (count === 0) {
      return null;
    }
    return toContract(await this.prisma.tag.findUniqueOrThrow({ where: { id } }));
  }

  /**
   * Re-points every item from one tag to another, then deletes the old tag, in
   * one transaction. An item that had both keeps the better (lower) position, so
   * a merged primary tag stays primary. False when either tag is missing.
   */
  async merge(fromTagId: string, intoTagId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      if ((await tx.tag.count({ where: { id: { in: [fromTagId, intoTagId] } } })) !== 2) {
        return false;
      }
      const links = await tx.itemTag.findMany({ where: { tagId: fromTagId } });
      const existing = await tx.itemTag.findMany({
        where: { tagId: intoTagId, itemId: { in: links.map((link) => link.itemId) } },
      });
      const targetPosition = new Map(existing.map((link) => [link.itemId, link.position]));
      await tx.itemTag.createMany({
        data: links
          .filter((link) => !targetPosition.has(link.itemId))
          .map((link) => ({ itemId: link.itemId, tagId: intoTagId, position: link.position })),
      });
      for (const link of links) {
        const position = targetPosition.get(link.itemId);
        if (position !== undefined && link.position < position) {
          await tx.itemTag.update({
            where: { itemId_tagId: { itemId: link.itemId, tagId: intoTagId } },
            data: { position: link.position },
          });
        }
      }
      await tx.tag.delete({ where: { id: fromTagId } });
      return true;
    });
  }
}

function toContract(row: TagRow): Tag {
  return { id: row.id, slug: row.slug, name: toLocalized(row), kind: row.kind };
}
