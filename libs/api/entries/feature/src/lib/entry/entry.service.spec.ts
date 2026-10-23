import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { type EntryRecord, EntryRepository } from '@menu/api/entries/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { AUTHOR_DIRECTORY, type EntryTarget, ITEM_CATALOG } from '@menu/api/shared/util-ports';
import { EntryService } from './entry.service';

describe('EntryService', () => {
  const author: Principal = { accountId: 'a1', isAdmin: false, language: 'he', ownedVenueIds: [] };
  const other: Principal = { ...author, accountId: 'a2' };
  const item: EntryTarget = { id: 'i1', venueId: 'v1', isPublic: true, acceptsEntry: true };
  const itemRef = { id: 'i1', name: { he: 'המבורגר' }, venue: { id: 'v1', name: { he: 'מוזס' } } };
  const input = {
    rating: 4,
    wouldOrderAgain: true,
    pricePaid: 6800,
    text: '',
    visibility: 'private' as const,
  };

  function record(overrides: Partial<EntryRecord> = {}): EntryRecord {
    return {
      id: 'e1',
      authorId: 'a1',
      itemId: 'i1',
      venueId: 'v1',
      eatenAt: '2026-10-20T19:30:00.000Z',
      rating: 4,
      wouldOrderAgain: true,
      pricePaid: 6800,
      text: '',
      visibility: 'private',
      shareToken: null,
      hidden: false,
      createdAt: '2026-10-20T20:00:00.000Z',
      updatedAt: '2026-10-20T20:00:00.000Z',
      ...overrides,
    };
  }

  async function setup(
    repository: Partial<Record<keyof EntryRepository, unknown>>,
    target: EntryTarget | null = item,
  ): Promise<EntryService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        EntryService,
        { provide: EntryRepository, useValue: repository },
        {
          provide: ITEM_CATALOG,
          useValue: {
            findForEntries: vi.fn().mockResolvedValue(target),
            refsFor: vi.fn().mockResolvedValue(new Map([['i1', itemRef]])),
          },
        },
        {
          provide: AUTHOR_DIRECTORY,
          useValue: { displayNames: vi.fn().mockResolvedValue(new Map([['a2', 'דנה']])) },
        },
      ],
    }).compile();
    return moduleRef.get(EntryService);
  }

  describe('logging an entry', () => {
    it('records it on the item’s venue, eaten now by default, with no link while private', async () => {
      const create = vi.fn().mockResolvedValue(record());
      await (await setup({ create })).create(author, 'i1', input);
      const saved: unknown = create.mock.calls[0]?.[0];
      expect(saved).toMatchObject({
        authorId: 'a1',
        itemId: 'i1',
        venueId: 'v1',
        shareToken: null,
      });
      expect(saved).toHaveProperty('eatenAt', expect.any(String));
    });

    it('creates a share link for a shared entry', async () => {
      const create = vi.fn().mockResolvedValue(record());
      await (await setup({ create })).create(author, 'i1', { ...input, visibility: 'shared' });
      expect(create.mock.calls[0]?.[0]).toHaveProperty(
        'shareToken',
        expect.stringMatching(/^[\w-]{22}$/),
      );
    });

    it('refuses an item that is not open to the caller', async () => {
      const service = await setup({ create: vi.fn() }, { ...item, acceptsEntry: false });
      await expect(service.create(author, 'i1', input)).rejects.toThrow(ForbiddenException);
    });

    it('fails with 404 for an item the caller cannot see', async () => {
      const service = await setup({ create: vi.fn() }, null);
      await expect(service.create(author, 'i1', input)).rejects.toThrow(NotFoundException);
    });
  });

  describe('the entries sheet', () => {
    it('puts the caller’s own entries first, then public ones with names', async () => {
      const listByAuthor = vi.fn().mockResolvedValue([record()]);
      const listPublicByItem = vi
        .fn()
        .mockResolvedValue([record({ id: 'e2', authorId: 'a2', visibility: 'public' })]);
      const sheet = await (
        await setup({ listByAuthor, listPublicByItem })
      ).listForItem(author, 'i1');
      expect(sheet.mine.map((entry) => entry.id)).toEqual(['e1']);
      expect(sheet.others).toEqual([expect.objectContaining({ id: 'e2', authorName: 'דנה' })]);
      expect(listPublicByItem).toHaveBeenCalledWith('i1', 'a1');
    });

    it('shows no one else’s entries on an item that is not public', async () => {
      const listPublicByItem = vi.fn();
      const service = await setup(
        { listByAuthor: vi.fn().mockResolvedValue([]), listPublicByItem },
        { ...item, isPublic: false },
      );
      await service.listForItem(author, 'i1');
      expect(listPublicByItem).not.toHaveBeenCalled();
    });

    it('shows visitors public entries only', async () => {
      const listByAuthor = vi.fn();
      const service = await setup({
        listByAuthor,
        listPublicByItem: vi.fn().mockResolvedValue([]),
      });
      await expect(service.listForItem(null, 'i1')).resolves.toEqual({ mine: [], others: [] });
      expect(listByAuthor).not.toHaveBeenCalled();
    });
  });

  describe('editing an entry', () => {
    it('adds a share link when the entry stops being private', async () => {
      const update = vi.fn().mockResolvedValue(record({ visibility: 'public' }));
      const service = await setup({ findById: vi.fn().mockResolvedValue(record()), update });
      await service.update(author, 'e1', { visibility: 'public' });
      expect(update.mock.calls[0]?.[2]).toMatchObject({
        visibility: 'public',
        shareToken: expect.any(String) as unknown,
      });
    });

    it('keeps the existing link', async () => {
      const shared = record({ visibility: 'shared', shareToken: 'abcdefghijklmnopqrstuv' });
      const update = vi.fn().mockResolvedValue(shared);
      const service = await setup({ findById: vi.fn().mockResolvedValue(shared), update });
      await service.update(author, 'e1', { visibility: 'public' });
      expect(update.mock.calls[0]?.[2]).toEqual({ visibility: 'public' });
    });

    it('fails with 404 for someone else’s entry', async () => {
      const service = await setup({
        findById: vi.fn().mockResolvedValue(record()),
        update: vi.fn(),
      });
      await expect(service.update(other, 'e1', { text: 'x' })).rejects.toThrow(NotFoundException);
    });
  });

  it('fails with 404 when deleting someone else’s entry', async () => {
    const service = await setup({ delete: vi.fn().mockResolvedValue(false) });
    await expect(service.remove(other, 'e1')).rejects.toThrow(NotFoundException);
  });

  it('hides an entry without saying whether it exists', async () => {
    const setHidden = vi.fn().mockResolvedValue(undefined);
    await expect((await setup({ setHidden })).setHidden('e1', true)).resolves.toBeUndefined();
    expect(setHidden).toHaveBeenCalledWith('e1', true);
  });

  it('lists the diary with each entry’s item and venue', async () => {
    const listByAuthor = vi
      .fn()
      .mockResolvedValue([record(), record({ id: 'e2', itemId: 'gone' })]);
    const diary = await (await setup({ listByAuthor })).diary(author, { venueId: 'v1' });
    expect(listByAuthor).toHaveBeenCalledWith('a1', { venueId: 'v1' });
    expect(diary).toEqual([expect.objectContaining({ id: 'e1', item: itemRef })]);
  });

  describe('a share link', () => {
    const shared = record({
      authorId: 'a2',
      visibility: 'shared',
      shareToken: 'abcdefghijklmnopqrstuv',
    });

    it('shows the entry with its author’s name', async () => {
      const service = await setup({ findByShareToken: vi.fn().mockResolvedValue(shared) });
      await expect(service.shared('abcdefghijklmnopqrstuv')).resolves.toMatchObject({
        status: 'visible',
        entry: { authorName: 'דנה' },
        item: itemRef,
      });
    });

    it('reads as removed when the entry was deleted', async () => {
      const service = await setup({ findByShareToken: vi.fn().mockResolvedValue(null) });
      await expect(service.shared('abcdefghijklmnopqrstuv')).resolves.toEqual({
        status: 'removed',
      });
    });

    it('reads as private when the item is not public', async () => {
      const service = await setup({ findByShareToken: vi.fn().mockResolvedValue(shared) }, null);
      await expect(service.shared('abcdefghijklmnopqrstuv')).resolves.toEqual({
        status: 'private',
      });
    });
  });
});
