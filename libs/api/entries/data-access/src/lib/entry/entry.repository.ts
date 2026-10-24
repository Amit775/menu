import { Injectable } from '@nestjs/common';
import { PrismaService } from '@menu/api/shared/db';
import { withoutUndefined } from '@menu/api/shared/util';
import {
  type Agorot,
  type DiaryQuery,
  type Entry,
  type EntryVisibility,
  type PhotoType,
  photoUrl,
  type UpdateEntry,
} from '@menu/shared/contracts';

/** An entry as the API sees it internally: the author's view plus who wrote it and its photo. */
export type EntryRecord = Entry & {
  authorId: string;
  photoId: string | null;
  photoType: PhotoType | null;
};

/** A photo's capability id and stored type (ADR 0011). */
export interface PhotoRef {
  photoId: string;
  photoType: PhotoType;
}

export interface NewEntry {
  authorId: string;
  itemId: string;
  venueId: string;
  eatenAt: string;
  rating: number | null;
  wouldOrderAgain: boolean | null;
  pricePaid: Agorot | null;
  text: string;
  visibility: EntryVisibility;
  shareToken: string | null;
}

/** One unhidden entry, reduced to what aggregates need. Never leaves the entries domain. */
export interface EntryFact {
  itemId: string;
  authorId: string;
  rating: number | null;
  wouldOrderAgain: boolean | null;
  pricePaid: number | null;
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
  venueId: string;
  eatenAt: Date;
  rating: number | null;
  wouldOrderAgain: boolean | null;
  pricePaid: number | null;
  text: string;
  visibility: EntryVisibility;
  shareToken: string | null;
  hiddenAt: Date | null;
  photoId: string | null;
  photoType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const newestFirst = [{ eatenAt: 'desc' }, { createdAt: 'desc' }] as const;

/** Maps between Prisma rows and records. The only code that touches `prisma.entry`. */
@Injectable()
export class EntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: NewEntry): Promise<EntryRecord> {
    const row = await this.prisma.entry.create({
      data: { ...input, eatenAt: new Date(input.eatenAt) },
    });
    return toRecord(row);
  }

  async findById(id: string): Promise<EntryRecord | null> {
    const row = await this.prisma.entry.findUnique({ where: { id } });
    return row ? toRecord(row) : null;
  }

  async findByPhotoId(photoId: string): Promise<EntryRecord | null> {
    const row = await this.prisma.entry.findUnique({ where: { photoId } });
    return row ? toRecord(row) : null;
  }

  /** Sets or removes the photo. Null when the entry is gone or not this author's. */
  async setPhoto(
    id: string,
    authorId: string,
    photo: PhotoRef | null,
  ): Promise<EntryRecord | null> {
    const { count } = await this.prisma.entry.updateMany({
      where: { id, authorId },
      data: photo ?? { photoId: null, photoType: null },
    });
    return count === 0 ? null : this.findById(id);
  }

  async findByShareToken(shareToken: string): Promise<EntryRecord | null> {
    const row = await this.prisma.entry.findUnique({ where: { shareToken } });
    return row ? toRecord(row) : null;
  }

  /** A diary, newest first, optionally for one venue or one item. */
  async listByAuthor(authorId: string, filter: DiaryQuery = {}): Promise<EntryRecord[]> {
    const rows = await this.prisma.entry.findMany({
      where: { authorId, ...withoutUndefined(filter) },
      orderBy: [...newestFirst],
    });
    return rows.map(toRecord);
  }

  /** Everyone else's public, unhidden entries on an item, newest first. */
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
    });
    return rows.map(toRecord);
  }

  /** Null when the entry is gone or not this author's. */
  async update(id: string, authorId: string, changes: EntryChanges): Promise<EntryRecord | null> {
    const { eatenAt, ...rest } = changes;
    const { count } = await this.prisma.entry.updateMany({
      where: { id, authorId },
      data: withoutUndefined({
        ...rest,
        eatenAt: eatenAt === undefined ? undefined : new Date(eatenAt),
      }),
    });
    return count === 0 ? null : this.findById(id);
  }

  /** False when the entry is gone or not this author's. */
  async delete(id: string, authorId: string): Promise<boolean> {
    const { count } = await this.prisma.entry.deleteMany({ where: { id, authorId } });
    return count > 0;
  }

  /**
   * Hides or shows an entry others can read. A private entry is left alone and
   * nothing is returned, so the caller cannot learn whether it exists.
   */
  async setHidden(id: string, hidden: boolean, newPhotoId: string): Promise<void> {
    await this.prisma.entry.updateMany({
      where: { id, visibility: { not: 'private' } },
      data: { hiddenAt: hidden ? new Date() : null },
    });
    if (hidden) {
      // Photo ids handed out while it was visible stop working (ADR 0011).
      await this.prisma.entry.updateMany({
        where: { id, visibility: { not: 'private' }, photoId: { not: null } },
        data: { photoId: newPhotoId },
      });
    }
  }

  /** Every unhidden entry, for aggregates. Fine at friends scale; a stored score can replace it. */
  listFacts(): Promise<EntryFact[]> {
    return this.prisma.entry.findMany({
      where: { hiddenAt: null },
      select: {
        itemId: true,
        authorId: true,
        rating: true,
        wouldOrderAgain: true,
        pricePaid: true,
        visibility: true,
        photoId: true,
        eatenAt: true,
        createdAt: true,
      },
    });
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
    return this.prisma.entry.count({ where: { authorId, venueId } });
  }

  /** Re-points every entry from one item to another. Safe to run twice. */
  async moveToItem(fromItemId: string, toItemId: string): Promise<void> {
    await this.prisma.entry.updateMany({
      where: { itemId: fromItemId },
      data: { itemId: toItemId },
    });
  }
}

function toRecord(row: EntryRow): EntryRecord {
  return {
    id: row.id,
    authorId: row.authorId,
    itemId: row.itemId,
    venueId: row.venueId,
    eatenAt: row.eatenAt.toISOString(),
    rating: row.rating,
    wouldOrderAgain: row.wouldOrderAgain,
    pricePaid: row.pricePaid,
    text: row.text,
    visibility: row.visibility,
    shareToken: row.shareToken,
    hidden: row.hiddenAt !== null,
    photoUrl: row.photoId ? photoUrl(row.photoId) : null,
    photoId: row.photoId,
    photoType: row.photoType as PhotoType | null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
