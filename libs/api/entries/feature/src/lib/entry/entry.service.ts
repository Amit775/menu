import { randomBytes } from 'node:crypto';
import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EntryRepository } from '@menu/api/entries/data-access';
import { withoutUndefined } from '@menu/api/shared/util';
import { type Principal } from '@menu/api/shared/util-auth';
import {
  AUTHOR_DIRECTORY,
  type AuthorDirectory,
  type EntryTarget,
  ITEM_CATALOG,
  type ItemCatalog,
} from '@menu/api/shared/util-ports';
import {
  type CreateEntry,
  type DiaryQuery,
  type Entry,
  type EntryWithItem,
  type ItemEntries,
  type SharedEntryView,
  type UpdateEntry,
} from '@menu/shared/contracts';
import { DiaryEntry } from './diary-entry';

/** 16 random bytes: 22 URL-safe characters, unguessable. */
function newShareToken(): string {
  return randomBytes(16).toString('base64url');
}

/**
 * Diary entries. Items are looked up through the menus catalog port and author
 * names through the users directory port (ADR 0004).
 */
@Injectable()
export class EntryService {
  constructor(
    private readonly repository: EntryRepository,
    @Inject(ITEM_CATALOG) private readonly catalog: ItemCatalog,
    @Inject(AUTHOR_DIRECTORY) private readonly authors: AuthorDirectory,
  ) {}

  /** The entries sheet: the caller's own entries, then other people's public ones. */
  async listForItem(principal: Principal | null, itemId: string): Promise<ItemEntries> {
    const item = await this.findItem(principal, itemId);
    const [refs, mine, others] = await Promise.all([
      this.catalog.refsFor([itemId]),
      principal ? this.repository.listByAuthor(principal.accountId, { itemId }) : [],
      item.isPublic ? this.repository.listPublicByItem(itemId, principal?.accountId ?? null) : [],
    ]);
    const ref = refs.get(itemId);
    if (!ref) {
      throw new NotFoundException('Item not found.');
    }
    const names = await this.authors.displayNames(others.map((entry) => entry.authorId));
    return {
      item: ref,
      mine: mine.map((record) => new DiaryEntry(record).toContract()),
      others: others.map((record) =>
        new DiaryEntry(record).toPublic(names.get(record.authorId) ?? ''),
      ),
    };
  }

  async create(principal: Principal, itemId: string, input: CreateEntry): Promise<Entry> {
    const item = await this.findItem(principal, itemId);
    if (!item.acceptsEntry) {
      throw new ForbiddenException('This item is not open to entries.');
    }
    const record = await this.repository.create({
      ...input,
      eatenAt: input.eatenAt ?? new Date().toISOString(),
      authorId: principal.accountId,
      itemId: item.id,
      venueId: item.venueId,
      shareToken: input.visibility === 'private' ? null : newShareToken(),
    });
    return new DiaryEntry(record).toContract();
  }

  /** The caller's own entries, each with its item and venue names. */
  async diary(principal: Principal, query: DiaryQuery): Promise<EntryWithItem[]> {
    const records = await this.repository.listByAuthor(principal.accountId, query);
    const refs = await this.catalog.refsFor(records.map((record) => record.itemId));
    return records.flatMap((record) => {
      const item = refs.get(record.itemId);
      return item ? [{ ...new DiaryEntry(record).toContract(), item }] : [];
    });
  }

  async get(principal: Principal, id: string): Promise<Entry> {
    return (await this.findOwn(principal, id)).toContract();
  }

  async update(principal: Principal, id: string, input: UpdateEntry): Promise<Entry> {
    const entry = await this.findOwn(principal, id);
    const next = new DiaryEntry({ ...entry.record, ...withoutUndefined(input) });
    const record = await this.repository.update(id, principal.accountId, {
      ...input,
      ...(next.needsShareToken() ? { shareToken: newShareToken() } : {}),
    });
    if (!record) {
      throw new NotFoundException('Entry not found.');
    }
    return new DiaryEntry(record).toContract();
  }

  async remove(principal: Principal, id: string): Promise<void> {
    if (!(await this.repository.delete(id, principal.accountId))) {
      throw new NotFoundException('Entry not found.');
    }
  }

  /**
   * Admin only (enforced by the controller). Always succeeds and returns nothing,
   * so an Admin learns nothing about a private or missing entry.
   */
  setHidden(id: string, hidden: boolean): Promise<void> {
    return this.repository.setHidden(id, hidden);
  }

  /** What a share link shows to anyone holding it. An unknown token reads as removed. */
  async shared(token: string): Promise<SharedEntryView> {
    const record = await this.repository.findByShareToken(token);
    if (!record) {
      return { status: 'removed' };
    }
    const entry = new DiaryEntry(record);
    const target = await this.catalog.findForEntries(null, record.itemId);
    const item = target?.isPublic
      ? ((await this.catalog.refsFor([record.itemId])).get(record.itemId) ?? null)
      : null;
    const names = await this.authors.displayNames([record.authorId]);
    return entry.sharedView(names.get(record.authorId) ?? '', item);
  }

  private async findItem(principal: Principal | null, itemId: string): Promise<EntryTarget> {
    const item = await this.catalog.findForEntries(principal, itemId);
    if (!item) {
      throw new NotFoundException('Item not found.');
    }
    return item;
  }

  private async findOwn(principal: Principal, id: string): Promise<DiaryEntry> {
    const record = await this.repository.findById(id);
    if (!record) {
      throw new NotFoundException('Entry not found.');
    }
    const entry = new DiaryEntry(record);
    entry.assertAuthor(principal);
    return entry;
  }
}
