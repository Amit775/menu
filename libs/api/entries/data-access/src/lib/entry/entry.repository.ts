import { Injectable } from '@nestjs/common';
import { PrismaService } from '@menu/api/shared/db';
import { withoutUndefined } from '@menu/api/shared/util';
import {
  type Agorot,
  type DiaryQuery,
  type Entry,
  type EntryVisibility,
  type UpdateEntry,
} from '@menu/shared/contracts';

/** An entry as the API sees it internally: the author's view plus who wrote it. */
export type EntryRecord = Entry & { authorId: string };

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

export type EntryChanges = UpdateEntry & { shareToken?: string };

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
  async setHidden(id: string, hidden: boolean): Promise<void> {
    await this.prisma.entry.updateMany({
      where: { id, visibility: { not: 'private' } },
      data: { hiddenAt: hidden ? new Date() : null },
    });
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
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
