import { Injectable } from '@nestjs/common';
import { fromLocalized, PrismaService, toLocalized } from '@menu/api/shared/db';
import { withoutUndefined } from '@menu/api/shared/util';
import {
  type Agorot,
  type Item,
  type ItemState,
  type LocalizedText,
  type UpdateItem,
} from '@menu/shared/contracts';

/** An item as the API sees it internally: the contract plus who submitted it. */
export type ItemRecord = Omit<Item, 'submittedByMe'> & { submittedById: string | null };

export interface NewItem {
  venueId: string;
  sectionId: string;
  name: LocalizedText;
  listPrice: Agorot | null;
  tagIds: readonly string[];
  state: Extract<ItemState, 'pending' | 'approved'>;
  submittedById: string | null;
}

interface ItemRow {
  id: string;
  venueId: string;
  sectionId: string;
  nameHe: string;
  nameEn: string | null;
  listPrice: number | null;
  state: ItemState;
  submittedById: string | null;
  mergedIntoId: string | null;
  position: number;
  createdAt: Date;
  tags: { tagId: string }[];
}

const withTags = { tags: { select: { tagId: true }, orderBy: { position: 'asc' } } } as const;

/** Maps between Prisma rows and records. The only code that touches `prisma.item` and `prisma.itemTag`. */
@Injectable()
export class ItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** A venue's items in menu order: those in `states`, plus anything `submittedById` submitted. */
  async listByVenue(
    venueId: string,
    states: readonly ItemState[],
    submittedById: string | null,
  ): Promise<ItemRecord[]> {
    const rows = await this.prisma.item.findMany({
      where: {
        venueId,
        OR: [
          { state: { in: [...states] } },
          ...(submittedById
            ? [{ submittedById, state: { in: ['pending', 'rejected'] as ItemState[] } }]
            : []),
        ],
      },
      include: withTags,
      orderBy: [{ section: { position: 'asc' } }, { position: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(toRecord);
  }

  /** Pending items awaiting a decision, oldest first. `venueIds: null` means every venue. */
  async listPending(venueIds: readonly string[] | null): Promise<ItemRecord[]> {
    const rows = await this.prisma.item.findMany({
      where: { state: 'pending', ...(venueIds ? { venueId: { in: [...venueIds] } } : {}) },
      include: withTags,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toRecord);
  }

  async findById(id: string): Promise<ItemRecord | null> {
    const row = await this.prisma.item.findUnique({ where: { id }, include: withTags });
    return row ? toRecord(row) : null;
  }

  /** Adds the item at the end of its section. */
  async create(input: NewItem): Promise<ItemRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      const last = await tx.item.aggregate({
        where: { sectionId: input.sectionId },
        _max: { position: true },
      });
      return tx.item.create({
        data: {
          venueId: input.venueId,
          sectionId: input.sectionId,
          ...fromLocalized(input.name),
          listPrice: input.listPrice,
          state: input.state,
          submittedById: input.submittedById,
          position: (last._max.position ?? -1) + 1,
          tags: { create: input.tagIds.map((tagId, position) => ({ tagId, position })) },
        },
        include: withTags,
      });
    });
    return toRecord(row);
  }

  /**
   * Updates fields; a new `tagIds` replaces the item's tags in the given order,
   * and a new section puts the item at the end of that section.
   */
  async update(id: string, input: UpdateItem): Promise<ItemRecord | null> {
    const { name, tagIds, ...rest } = input;
    const row = await this.prisma.$transaction(async (tx) => {
      const current = await tx.item.findUnique({ where: { id }, select: { sectionId: true } });
      if (!current) {
        return null;
      }
      let position: number | undefined;
      if (rest.sectionId !== undefined && rest.sectionId !== current.sectionId) {
        const last = await tx.item.aggregate({
          where: { sectionId: rest.sectionId },
          _max: { position: true },
        });
        position = (last._max.position ?? -1) + 1;
      }
      await tx.item.update({
        where: { id },
        data: withoutUndefined({ ...rest, position, ...(name ? fromLocalized(name) : {}) }),
      });
      if (tagIds) {
        await tx.itemTag.deleteMany({ where: { itemId: id } });
        await tx.itemTag.createMany({
          data: tagIds.map((tagId, position) => ({ itemId: id, tagId, position })),
        });
      }
      return tx.item.findUniqueOrThrow({ where: { id }, include: withTags });
    });
    return row ? toRecord(row) : null;
  }

  /** Moves an item to a new state, only if it is still in `from` (guards concurrent decisions). */
  async transition(
    id: string,
    from: ItemState,
    to: ItemState,
    mergedIntoId: string | null = null,
  ): Promise<ItemRecord | null> {
    const { count } = await this.prisma.item.updateMany({
      where: { id, state: from },
      data: { state: to, mergedIntoId },
    });
    return count === 0 ? null : this.findById(id);
  }
}

function toRecord(row: ItemRow): ItemRecord {
  return {
    id: row.id,
    venueId: row.venueId,
    sectionId: row.sectionId,
    name: toLocalized(row),
    listPrice: row.listPrice,
    tagIds: row.tags.map((tag) => tag.tagId),
    state: row.state,
    mergedIntoId: row.mergedIntoId,
    submittedById: row.submittedById,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}
