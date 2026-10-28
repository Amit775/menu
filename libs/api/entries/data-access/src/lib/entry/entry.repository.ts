import { Injectable } from '@nestjs/common';
import {
  DbNull,
  type DecimalColumn,
  PrismaService,
  readPrice,
  writePrice,
} from '@menu/api/shared/db';
import { withoutUndefined } from '@menu/api/shared/util';
import {
  type Currency,
  type DiaryQuery,
  type Entry,
  type EntryVisibility,
  PhotoIdSchema,
  type PhotoType,
  PhotoTypeSchema,
  photoUrl,
  type Price,
  type UpdateEntry,
} from '@menu/shared/contracts';

export type EntryRecord = Entry & {
  authorId: string;
  photoId: string | null;
  photoType: PhotoType | null;
};

export interface PhotoRef {
  photoId: string;
  photoType: PhotoType;
}

export interface NewEntry {
  authorId: string;
  itemId: string;
  variationId: string | null;
  eatenAt: string;
  rating: number | null;
  wouldOrderAgain: boolean | null;
  pricePaid: Price | null;
  text: string;
  visibility: EntryVisibility;
  shareToken: string | null;
}

export interface EntryFact {
  itemId: string;
  variationId: string | null;
  authorId: string;
  rating: number | null;
  wouldOrderAgain: boolean | null;
  pricePaid: Price | null;
  visibility: EntryVisibility;
  photoId: string | null;
  eatenAt: Date;
  createdAt: Date;
}

export type EntryChanges = UpdateEntry & { shareToken?: string; photoId?: string };

interface EntryRow {
  id: string;
  authorId: string;
  itemId: string;
  variationId: string | null;
  eatenAt: Date;
  rating: number | null;
  wouldOrderAgain: boolean | null;
  pricePaidValue: DecimalColumn | null;
  pricePaidCurrency: Currency | null;
  text: string;
  visibility: EntryVisibility;
  shareToken: string | null;
  hiddenAt: Date | null;
  photo: unknown;
  createdAt: Date;
  updatedAt: Date;
  item: { venueId: string };
}

const newestFirst = [{ eatenAt: 'desc' }, { createdAt: 'desc' }] as const;

// Items never move venue, so an entry's venue is read through its item.
const withVenue = { item: { select: { venueId: true } } } as const;

@Injectable()
export class EntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: NewEntry): Promise<EntryRecord> {
    const { pricePaid, ...rest } = input;
    const row = await this.prisma.entry.create({
      data: { ...rest, ...priceColumns(pricePaid), eatenAt: new Date(input.eatenAt) },
      include: withVenue,
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<EntryRecord | null> {
    const row = await this.prisma.entry.findUnique({ where: { id }, include: withVenue });
    return row ? toRecord(row) : null;
  }

  async findByPhotoId(photoId: string): Promise<EntryRecord | null> {
    const [match] = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "entry" WHERE "photo" @> ${JSON.stringify({ id: photoId })}::jsonb LIMIT 1`;
    return match ? this.findById(match.id) : null;
  }

  async setPhoto(
    id: string,
    authorId: string,
    photo: PhotoRef | null,
  ): Promise<EntryRecord | null> {
    const { count } = await this.prisma.entry.updateMany({
      where: { id, authorId },
      data: { photo: photo ? { id: photo.photoId, contentType: photo.photoType } : DbNull },
    });
    return count === 0 ? null : this.findById(id);
  }

  async findByShareToken(shareToken: string): Promise<EntryRecord | null> {
    const row = await this.prisma.entry.findUnique({ where: { shareToken }, include: withVenue });
    return row ? toRecord(row) : null;
  }

  async listByAuthor(authorId: string, filter: DiaryQuery = {}): Promise<EntryRecord[]> {
    const rows = await this.prisma.entry.findMany({
      where: withoutUndefined({
        authorId,
        itemId: filter.itemId,
        item: filter.venueId ? { venueId: filter.venueId } : undefined,
      }),
      orderBy: [...newestFirst],
      include: withVenue,
    });
    return rows.map(toRecord);
  }

  async listPublicByItem(itemId: string, exceptAuthorId: string | null): Promise<EntryRecord[]> {
    const rows = await this.prisma.entry.findMany({
      where: {
        itemId,
        visibility: 'public',
        hiddenAt: null,
        ...(exceptAuthorId ? { authorId: { not: exceptAuthorId } } : {}),
      },
      orderBy: [...newestFirst],
      take: 200,
      include: withVenue,
    });
    return rows.map(toRecord);
  }

  async update(id: string, authorId: string, changes: EntryChanges): Promise<EntryRecord | null> {
    const { eatenAt, pricePaid, photoId, ...rest } = changes;
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.entry.updateMany({
        where: { id, authorId },
        data: withoutUndefined({
          ...rest,
          ...(pricePaid === undefined ? {} : priceColumns(pricePaid)),
          eatenAt: eatenAt === undefined ? undefined : new Date(eatenAt),
        }),
      });
      if (count === 0) {
        return null;
      }
      if (photoId) {
        await tx.$executeRaw`
          UPDATE "entry" SET "photo" = jsonb_set("photo", '{id}', to_jsonb(${photoId}::text))
          WHERE "id" = ${id}::uuid AND "photo" IS NOT NULL`;
      }
      return toRecord(await tx.entry.findUniqueOrThrow({ where: { id }, include: withVenue }));
    });
  }

  async delete(id: string, authorId: string): Promise<boolean> {
    const { count } = await this.prisma.entry.deleteMany({ where: { id, authorId } });
    return count > 0;
  }

  /**
   * Hides or shows an entry others can read. A private entry is left alone and
   * nothing is returned, so the caller cannot learn whether it exists.
   */
  async setHidden(id: string, hidden: boolean, newPhotoId: string): Promise<void> {
    const where = { id, visibility: { not: 'private' as const } };
    await this.prisma.$transaction([
      this.prisma.entry.updateMany({ where, data: { hiddenAt: hidden ? new Date() : null } }),
      // Photo ids handed out while it was visible stop working (ADR 0011).
      ...(hidden
        ? [
            this.prisma.$executeRaw`
              UPDATE "entry" SET "photo" = jsonb_set("photo", '{id}', to_jsonb(${newPhotoId}::text))
              WHERE "id" = ${id}::uuid AND "visibility" <> 'private' AND "photo" IS NOT NULL`,
          ]
        : []),
    ]);
  }

  /** Every unhidden entry, for aggregates. Fine at friends scale; a stored score can replace it. */
  async listFacts(): Promise<EntryFact[]> {
    const rows = await this.prisma.entry.findMany({
      where: { hiddenAt: null },
      select: {
        itemId: true,
        variationId: true,
        authorId: true,
        rating: true,
        wouldOrderAgain: true,
        pricePaidValue: true,
        pricePaidCurrency: true,
        visibility: true,
        photo: true,
        eatenAt: true,
        createdAt: true,
      },
    });
    return rows.map(({ pricePaidValue, pricePaidCurrency, photo, ...fact }) => ({
      ...fact,
      pricePaid: readPrice(pricePaidValue, pricePaidCurrency),
      photoId: readPhoto(photo)?.id ?? null,
    }));
  }

  /** Hidden entries count: they are still the author's. */
  async itemIdsWrittenBy(authorId: string): Promise<Set<string>> {
    const rows = await this.prisma.entry.findMany({
      where: { authorId },
      select: { itemId: true },
      distinct: ['itemId'],
    });
    return new Set(rows.map((row) => row.itemId));
  }

  countByAuthorAtVenue(authorId: string, venueId: string): Promise<number> {
    return this.prisma.entry.count({ where: { authorId, item: { venueId } } });
  }

  /**
   * Re-points every entry from one item to another. Safe to run twice. The old
   * item's variations are not the new one's, so the entries lose theirs.
   */
  async moveToItem(fromItemId: string, toItemId: string): Promise<void> {
    await this.prisma.entry.updateMany({
      where: { itemId: fromItemId },
      data: { itemId: toItemId, variationId: null },
    });
  }
}

function toRecord(row: EntryRow): EntryRecord {
  const photo = readPhoto(row.photo);
  return {
    id: row.id,
    authorId: row.authorId,
    itemId: row.itemId,
    variationId: row.variationId,
    venueId: row.item.venueId,
    eatenAt: row.eatenAt.toISOString(),
    rating: row.rating,
    wouldOrderAgain: row.wouldOrderAgain,
    pricePaid: readPrice(row.pricePaidValue, row.pricePaidCurrency),
    text: row.text,
    visibility: row.visibility,
    shareToken: row.shareToken,
    hidden: row.hiddenAt !== null,
    photoUrl: photo ? photoUrl(photo.id) : null,
    photoId: photo?.id ?? null,
    photoType: photo?.contentType ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function readPhoto(column: unknown): { id: string; contentType: PhotoType } | null {
  if (column === null) {
    return null;
  }
  if (typeof column !== 'object' || !('id' in column) || !('contentType' in column)) {
    throw new Error('A stored photo needs its id and content type.');
  }
  return {
    id: PhotoIdSchema.parse(column.id),
    contentType: PhotoTypeSchema.parse(column.contentType),
  };
}

function priceColumns(price: Price | null) {
  const { value, currency } = writePrice(price);
  return { pricePaidValue: value, pricePaidCurrency: currency };
}
