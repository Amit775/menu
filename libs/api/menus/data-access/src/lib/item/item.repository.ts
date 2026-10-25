import { Injectable } from '@nestjs/common';
import {
  DbNull,
  type DecimalColumn,
  PrismaService,
  readLongText,
  readPrice,
  readText,
  writePrice,
} from '@menu/api/shared/db';
import { withoutUndefined } from '@menu/api/shared/util';
import {
  type Currency,
  type Item,
  type ItemState,
  MenuSectionSchema,
  type Price,
  type Text,
  type UpdateItem,
} from '@menu/shared/contracts';

export type ItemRecord = Omit<Item, 'submittedByMe'> & { submittedById: string | null };

export interface NewItem {
  venueId: string;
  sectionId: string;
  name: Text;
  description: Text | null;
  listPrice: Price | null;
  tagIds: readonly string[];
  state: Extract<ItemState, 'pending' | 'approved'>;
  submittedById: string | null;
}

interface ItemRow {
  id: string;
  venueId: string;
  sectionId: string;
  name: unknown;
  description: unknown;
  listPriceValue: DecimalColumn | null;
  listPriceCurrency: Currency | null;
  tagIds: string[];
  state: ItemState;
  submittedById: string | null;
  mergedIntoId: string | null;
  position: number;
  createdAt: Date;
}

const SectionIdsSchema = MenuSectionSchema.pick({ id: true }).array();

export class UnknownTagError extends Error {
  constructor() {
    super('Unknown tag.');
  }
}

type Transaction = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];

// tag_ids has no foreign key, so the tags are share-locked until the write commits; a merge
// locks them for update, so it either waits for this write or makes it see the tag is gone.
async function assertTagsExist(tx: Transaction, tagIds: readonly string[]): Promise<void> {
  if (tagIds.length === 0) {
    return;
  }
  const found = await tx.$queryRaw<{ id: string }[]>`
    SELECT "id" FROM "tag" WHERE "id" = ANY(${[...tagIds]}::uuid[]) FOR SHARE`;
  if (found.length !== new Set(tagIds).size) {
    throw new UnknownTagError();
  }
}

@Injectable()
export class ItemRepository {
  constructor(private readonly prisma: PrismaService) {}

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
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    const venue = await this.prisma.venue.findUnique({
      where: { id: venueId },
      select: { sections: true },
    });
    const order = SectionIdsSchema.parse(venue?.sections ?? []).map((section) => section.id);
    const rank = (sectionId: string) => {
      const index = order.indexOf(sectionId);
      return index === -1 ? order.length : index;
    };
    return rows
      .map(toRecord)
      .sort((a, b) => rank(a.sectionId) - rank(b.sectionId) || a.position - b.position);
  }

  async listPending(venueIds: readonly string[] | null): Promise<ItemRecord[]> {
    const rows = await this.prisma.item.findMany({
      where: { state: 'pending', ...(venueIds ? { venueId: { in: [...venueIds] } } : {}) },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toRecord);
  }

  async findById(id: string): Promise<ItemRecord | null> {
    const row = await this.prisma.item.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async findByIds(ids: readonly string[]): Promise<ItemRecord[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.item.findMany({
      where: { id: { in: [...ids] } },
    });
    return rows.map(toRecord);
  }

  async create(input: NewItem): Promise<ItemRecord> {
    const row = await this.prisma.$transaction(async (tx) => {
      await assertTagsExist(tx, input.tagIds);
      const last = await tx.item.aggregate({
        where: { sectionId: input.sectionId },
        _max: { position: true },
      });
      return tx.item.create({
        data: {
          venueId: input.venueId,
          sectionId: input.sectionId,
          name: input.name,
          description: input.description ?? DbNull,
          ...priceColumns(input.listPrice),
          tagIds: [...input.tagIds],
          state: input.state,
          submittedById: input.submittedById,
          position: (last._max.position ?? -1) + 1,
        },
      });
    });
    return toRecord(row);
  }

  /**
   * Updates fields; a new `tagIds` replaces the item's tags in the given order,
   * and a new section puts the item at the end of that section.
   */
  async update(id: string, input: UpdateItem): Promise<ItemRecord | null> {
    const { description, listPrice, tagIds, ...rest } = input;
    const row = await this.prisma.$transaction(async (tx) => {
      const current = await tx.item.findUnique({ where: { id }, select: { sectionId: true } });
      if (!current) {
        return null;
      }
      await assertTagsExist(tx, tagIds ?? []);
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
        data: withoutUndefined({
          ...rest,
          position,
          tagIds: tagIds ? [...tagIds] : undefined,
          ...(description === undefined ? {} : { description: description ?? DbNull }),
          ...(listPrice === undefined ? {} : priceColumns(listPrice)),
        }),
      });
      return tx.item.findUniqueOrThrow({ where: { id } });
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
    name: readText(row.name),
    description: row.description === null ? null : readLongText(row.description),
    listPrice: readPrice(row.listPriceValue, row.listPriceCurrency),
    tagIds: row.tagIds,
    state: row.state,
    mergedIntoId: row.mergedIntoId,
    submittedById: row.submittedById,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
  };
}

function priceColumns(price: Price | null) {
  const { value, currency } = writePrice(price);
  return { listPriceValue: value, listPriceCurrency: currency };
}
