import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EntryRepository } from '@menu/api/entries/data-access';
import { newCapabilityId, withoutUndefined } from '@menu/api/shared/util';
import { PHOTO_STORAGE, type PhotoStorage } from '@menu/api/shared/util-photos';
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
import { deletePhoto } from '../photo/entry-photo';
import { DiaryEntry } from './diary-entry';

@Injectable()
export class EntryService {
  private readonly logger = new Logger(EntryService.name);

  constructor(
    private readonly repository: EntryRepository,
    @Inject(ITEM_CATALOG) private readonly catalog: ItemCatalog,
    @Inject(AUTHOR_DIRECTORY) private readonly authors: AuthorDirectory,
    @Inject(PHOTO_STORAGE) private readonly photos: PhotoStorage,
  ) {}

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
      itemIsPublic: item.isPublic,
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
    assertOffered(item, input.variationId);
    const record = await this.repository.create({
      ...input,
      eatenAt: input.eatenAt ?? new Date().toISOString(),
      authorId: principal.accountId,
      itemId: item.id,
      shareToken: input.visibility === 'private' ? null : newCapabilityId(),
    });
    return new DiaryEntry(record).toContract();
  }

  async diary(principal: Principal, query: DiaryQuery): Promise<EntryWithItem[]> {
    const records = await this.repository.listByAuthor(principal.accountId, query);
    const refs = await this.catalog.refsFor(records.map((record) => record.itemId));
    return records.flatMap((record) => {
      const item = refs.get(record.itemId);
      if (!item) {
        // Items and venues are archived, never deleted, so this is a data bug to look at.
        this.logger.warn(`Diary entry ${record.id} names item ${record.itemId}, which is gone.`);
        return [];
      }
      return [{ ...new DiaryEntry(record).toContract(), item }];
    });
  }

  async get(principal: Principal, id: string): Promise<Entry> {
    return (await this.findOwn(principal, id)).toContract();
  }

  async update(principal: Principal, id: string, input: UpdateEntry): Promise<Entry> {
    const entry = await this.findOwn(principal, id);
    if (input.variationId !== undefined && input.variationId !== entry.record.variationId) {
      const item = await this.findItem(principal, entry.record.itemId);
      if (!item.acceptsEntry) {
        throw new ForbiddenException('This item is not open to entries.');
      }
      assertOffered(item, input.variationId);
    }
    const next = new DiaryEntry({ ...entry.record, ...withoutUndefined(input) });
    const record = await this.repository.update(id, principal.accountId, {
      ...input,
      ...(next.needsShareToken() ? { shareToken: newCapabilityId() } : {}),
      ...(input.visibility && entry.narrowsTo(input.visibility)
        ? { photoId: newCapabilityId() }
        : {}),
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
    await deletePhoto(this.photos, id);
  }

  /**
   * Admin only (enforced by the controller). Always succeeds and returns nothing,
   * so an Admin learns nothing about a private or missing entry.
   */
  setHidden(id: string, hidden: boolean): Promise<void> {
    return this.repository.setHidden(id, hidden, newCapabilityId());
  }

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

function assertOffered(item: EntryTarget, variationId: string | null): void {
  const variation = item.variations.find((candidate) => candidate.id === variationId);
  if (variationId !== null && !variation?.available) {
    throw new BadRequestException('This item does not come in that variation now.');
  }
}
