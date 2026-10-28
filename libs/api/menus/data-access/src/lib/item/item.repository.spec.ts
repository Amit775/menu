import { DbNull, type PrismaService } from '@menu/api/shared/db';
import { ItemNotEditableError, ItemRepository, UnknownTagError } from './item.repository';

describe('ItemRepository', () => {
  const venueId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
  const row = {
    id: 'i1',
    venueId,
    sectionId: 's1',
    name: { he: 'המבורגר', en: null },
    description: null,
    listPriceValue: { toNumber: () => 68.5 },
    listPriceCurrency: 'ILS' as const,
    tagIds: ['t1', 't2'],
    variations: [],
    state: 'approved' as const,
    submittedById: null,
    mergedIntoId: null,
    position: 0,
    photo: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const record = {
    id: 'i1',
    venueId,
    sectionId: 's1',
    name: { he: 'המבורגר', en: null },
    description: null,
    listPrice: { value: 68.5, currency: 'ILS' as const },
    tagIds: ['t1', 't2'],
    variations: [],
    state: 'approved',
    mergedIntoId: null,
    submittedById: null,
    position: 0,
    photoUrl: null,
    photoId: null,
    photoType: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const veganTag = '3a2d3c4e-3333-4c1c-9a57-6f7a5d3c2b10';
  const vegan = {
    id: '5d2d3c4e-4444-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'טבעוני', en: null },
    price: { value: 62, currency: 'ILS' as const },
    tagIds: [veganTag],
    available: true,
  };

  it('reads an item’s variations in menu order', async () => {
    const findUnique = vi.fn().mockResolvedValue({ ...row, variations: [vegan] });
    const repository = new ItemRepository({ item: { findUnique } } as unknown as PrismaService);
    await expect(repository.findById('i1')).resolves.toMatchObject({ variations: [vegan] });
  });

  it('rejects a row whose variations do not parse', async () => {
    const findUnique = vi.fn().mockResolvedValue({ ...row, variations: [{ id: 'x' }] });
    const repository = new ItemRepository({ item: { findUnique } } as unknown as PrismaService);
    await expect(repository.findById('i1')).rejects.toThrow();
  });

  it('rejects a row with half a price', async () => {
    const findUnique = vi.fn().mockResolvedValue({ ...row, listPriceCurrency: null });
    const repository = new ItemRepository({ item: { findUnique } } as unknown as PrismaService);
    await expect(repository.findById('i1')).rejects.toThrow();
  });

  it('reads a description longer than a name', async () => {
    const description = { he: 'א'.repeat(1500), en: null };
    const findUnique = vi.fn().mockResolvedValue({ ...row, description });
    const repository = new ItemRepository({ item: { findUnique } } as unknown as PrismaService);
    await expect(repository.findById('i1')).resolves.toMatchObject({ description });
  });

  it('maps rows with their tags in order', async () => {
    const findUnique = vi.fn().mockResolvedValue(row);
    const repository = new ItemRepository({ item: { findUnique } } as unknown as PrismaService);
    await expect(repository.findById('i1')).resolves.toEqual(record);
  });

  it('finds items by id, without a query for none', async () => {
    const findMany = vi.fn().mockResolvedValue([row]);
    const repository = new ItemRepository({ item: { findMany } } as unknown as PrismaService);
    await expect(repository.findByIds([])).resolves.toEqual([]);
    expect(findMany).not.toHaveBeenCalled();
    await expect(repository.findByIds(['i1'])).resolves.toEqual([record]);
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({ where: { id: { in: ['i1'] } } });
  });

  it("lists the menu plus the caller's own submissions", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = new ItemRepository({
      item: { findMany },
      venue: { findUnique: vi.fn().mockResolvedValue({ sections: [] }) },
    } as unknown as PrismaService);
    await repository.listByVenue(venueId, ['approved'], 'me');
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        venueId,
        OR: [
          { state: { in: ['approved'] } },
          { submittedById: 'me', state: { in: ['pending', 'rejected'] } },
        ],
      },
    });
  });

  it('lists the menu in section order, then by position', async () => {
    const s1 = '1b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
    const s2 = '2b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
    const findMany = vi.fn().mockResolvedValue([
      { ...row, id: 'a', sectionId: s1, position: 0 },
      { ...row, id: 'b', sectionId: s2, position: 1 },
      { ...row, id: 'c', sectionId: s2, position: 0 },
    ]);
    const sections = [
      { id: s2, name: { he: 'שתייה', en: null } },
      { id: s1, name: { he: 'עיקריות', en: null } },
    ];
    const repository = new ItemRepository({
      item: { findMany },
      venue: { findUnique: vi.fn().mockResolvedValue({ sections }) },
    } as unknown as PrismaService);
    const items = await repository.listByVenue(venueId, ['approved'], null);
    expect(items.map((item) => item.id)).toEqual(['c', 'b', 'a']);
  });

  const snapshot = {
    name: { he: 'המבורגר', en: null },
    description: null,
    listPrice: { value: 68.5, currency: 'ILS' },
    sectionId: 's1',
    tagIds: ['t1', 't2'],
    variations: [],
  };

  it('appends a new item to its section with ordered tags', async () => {
    const create = vi.fn().mockResolvedValue(row);
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 't1' }, { id: 't2' }]),
      item: { aggregate: vi.fn().mockResolvedValue({ _max: { position: 4 } }), create },
      itemRevision: { create: vi.fn() },
    };
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    const repository = new ItemRepository(prisma as unknown as PrismaService);
    await repository.create(
      {
        venueId,
        sectionId: 's1',
        name: { he: 'המבורגר', en: null },
        description: { he: 'קציצת בקר', en: null },
        listPrice: { value: 68.5, currency: 'ILS' as const },
        tagIds: ['t1', 't2'],
        variations: [],
        state: 'pending',
        submittedById: 'u1',
      },
      'u1',
    );
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        name: { he: 'המבורגר', en: null },
        description: { he: 'קציצת בקר', en: null },
        listPriceValue: 68.5,
        listPriceCurrency: 'ILS',
        position: 5,
        state: 'pending',
        submittedById: 'u1',
        tagIds: ['t1', 't2'],
      },
    });
  });

  it('records a submission with the item as it was saved', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 't1' }, { id: 't2' }]),
      item: {
        aggregate: vi.fn().mockResolvedValue({ _max: { position: 0 } }),
        create: vi.fn().mockResolvedValue(row),
      },
      itemRevision: { create: vi.fn() },
    };
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    await new ItemRepository(prisma as unknown as PrismaService).create(
      { ...record, state: 'pending', submittedById: 'u1' },
      'u1',
    );
    expect(tx.itemRevision.create).toHaveBeenCalledWith({
      data: { itemId: 'i1', kind: 'submitted', snapshot, changedById: 'u1' },
    });
  });

  it('records an item an approver adds as created, by them', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 't1' }, { id: 't2' }]),
      item: {
        aggregate: vi.fn().mockResolvedValue({ _max: { position: 0 } }),
        create: vi.fn().mockResolvedValue(row),
      },
      itemRevision: { create: vi.fn() },
    };
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    await new ItemRepository(prisma as unknown as PrismaService).create(
      { ...record, state: 'approved', submittedById: null },
      'w1',
    );
    expect(tx.itemRevision.create).toHaveBeenCalledWith({
      data: { itemId: 'i1', kind: 'created', snapshot, changedById: 'w1' },
    });
  });

  it('refuses a tag that was merged away before the write', async () => {
    const create = vi.fn();
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 't1' }]),
      item: { aggregate: vi.fn().mockResolvedValue({ _max: { position: 4 } }), create },
    };
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    const repository = new ItemRepository(prisma as unknown as PrismaService);
    await expect(
      repository.create(
        {
          venueId,
          sectionId: 's1',
          name: { he: 'המבורגר', en: null },
          description: null,
          listPrice: null,
          tagIds: ['t1', 't2'],
          variations: [],
          state: 'approved',
          submittedById: null,
        },
        'a1',
      ),
    ).rejects.toThrow(UnknownTagError);
    expect(create).not.toHaveBeenCalled();
    expect(tx.$queryRaw.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([expect.stringContaining('FOR SHARE')]),
    );
  });

  describe('transition', () => {
    function prismaWith(count: number) {
      const tx = {
        item: {
          updateMany: vi.fn().mockResolvedValue({ count }),
          findUniqueOrThrow: vi.fn().mockResolvedValue({ ...row, state: 'archived' }),
        },
        itemRevision: { create: vi.fn() },
        itemReport: { deleteMany: vi.fn() },
      };
      const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
      return { tx, repository: new ItemRepository(prisma as unknown as PrismaService) };
    }

    it('only transitions an item that is still in the expected state', async () => {
      const { tx, repository } = prismaWith(0);
      await expect(
        repository.transition('i1', 'pending', 'approved', null, 'a1'),
      ).resolves.toBeNull();
      expect(tx.item.updateMany).toHaveBeenCalledWith({
        where: { id: 'i1', state: 'pending' },
        data: { state: 'approved', mergedIntoId: null },
      });
      expect(tx.itemRevision.create).not.toHaveBeenCalled();
    });

    it('records the decision and who made it', async () => {
      const { tx, repository } = prismaWith(1);
      await expect(
        repository.transition('i1', 'approved', 'archived', null, 'a1'),
      ).resolves.toMatchObject({ state: 'archived' });
      expect(tx.itemRevision.create).toHaveBeenCalledWith({
        data: { itemId: 'i1', kind: 'archived', snapshot, changedById: 'a1' },
      });
    });

    it('closes the reports of an item taken off the menu', async () => {
      const { tx, repository } = prismaWith(1);
      await repository.transition('i1', 'approved', 'archived', null, 'a1');
      expect(tx.itemReport.deleteMany).toHaveBeenCalledWith({ where: { itemId: 'i1' } });
    });

    it('keeps the reports when an item reaches the menu', async () => {
      const { tx, repository } = prismaWith(1);
      await repository.transition('i1', 'pending', 'approved', null, 'a1');
      expect(tx.itemReport.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    function prismaWith(current: unknown) {
      const tx = {
        item: {
          updateMany: vi.fn().mockResolvedValue({ count: current ? 1 : 0 }),
          findUniqueOrThrow: vi.fn().mockResolvedValue(current),
        },
        itemRevision: { create: vi.fn() },
        itemReport: { deleteMany: vi.fn() },
      };
      const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
      return { tx, repository: new ItemRepository(prisma as unknown as PrismaService) };
    }

    it('records that an item on the menu is still served and closes its reports', async () => {
      const { tx, repository } = prismaWith(row);
      await expect(repository.confirm('i1', 'w1')).resolves.toBe(true);
      expect(tx.item.updateMany).toHaveBeenCalledWith({
        where: { id: 'i1', state: 'approved' },
        data: { state: 'approved' },
      });
      expect(tx.itemRevision.create).toHaveBeenCalledWith({
        data: { itemId: 'i1', kind: 'confirmed', snapshot, changedById: 'w1' },
      });
      expect(tx.itemReport.deleteMany).toHaveBeenCalledWith({ where: { itemId: 'i1' } });
    });

    it('confirms nothing for an item that is not on the menu', async () => {
      const { tx, repository } = prismaWith(null);
      await expect(repository.confirm('i1', 'w1')).resolves.toBe(false);
      expect(tx.itemRevision.create).not.toHaveBeenCalled();
      expect(tx.itemReport.deleteMany).not.toHaveBeenCalled();
    });
  });

  it('reads an item’s photo as its public URL', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      ...row,
      photo: { id: 'abcdefghijklmnopqrstuv', contentType: 'image/webp' },
    });
    const repository = new ItemRepository({ item: { findUnique } } as unknown as PrismaService);
    await expect(repository.findById('i1')).resolves.toMatchObject({
      photoUrl: '/api/item-photos/abcdefghijklmnopqrstuv',
      photoId: 'abcdefghijklmnopqrstuv',
      photoType: 'image/webp',
    });
  });

  it('finds an item by its photo id, or none', async () => {
    const $queryRaw = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'i1' }])
      .mockResolvedValueOnce([]);
    const findUnique = vi.fn().mockResolvedValue(row);
    const repository = new ItemRepository({
      $queryRaw,
      item: { findUnique },
    } as unknown as PrismaService);
    await expect(repository.findByPhotoId('abcdefghijklmnopqrstuv')).resolves.toMatchObject({
      id: 'i1',
    });
    expect($queryRaw.mock.calls[0]?.[1]).toBe('{"id":"abcdefghijklmnopqrstuv"}');
    await expect(repository.findByPhotoId('abcdefghijklmnopqrstuv')).resolves.toBeNull();
  });

  it('sets and clears the photo of an item that is still editable', async () => {
    const updateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const findUnique = vi.fn().mockResolvedValue(row);
    const repository = new ItemRepository({
      item: { updateMany, findUnique },
    } as unknown as PrismaService);
    const photo = { photoId: 'abcdefghijklmnopqrstuv', photoType: 'image/jpeg' as const };
    await expect(repository.setPhoto('i1', photo)).resolves.toMatchObject({ id: 'i1' });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'i1', state: { in: ['pending', 'approved'] } },
      data: { photo: { id: 'abcdefghijklmnopqrstuv', contentType: 'image/jpeg' } },
    });
    await expect(repository.setPhoto('i1', null)).rejects.toThrow(ItemNotEditableError);
    expect(updateMany).toHaveBeenLastCalledWith({
      where: { id: 'i1', state: { in: ['pending', 'approved'] } },
      data: { photo: DbNull },
    });
  });

  it('lists pending items of the given venues, oldest first', async () => {
    const findMany = vi.fn().mockResolvedValue([row]);
    const repository = new ItemRepository({ item: { findMany } } as unknown as PrismaService);
    await repository.listPending([venueId]);
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { state: 'pending', venueId: { in: [venueId] } },
      orderBy: { createdAt: 'asc' },
    });
  });

  describe('update', () => {
    function prismaWith(current: unknown, tags: { id: string }[] = [], count = 1) {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue(tags),
        item: {
          findUnique: vi.fn().mockResolvedValue(current),
          aggregate: vi.fn().mockResolvedValue({ _max: { position: 4 } }),
          updateMany: vi.fn().mockResolvedValue({ count }),
          findUniqueOrThrow: vi.fn().mockResolvedValue(row),
        },
        itemRevision: { create: vi.fn() },
        itemReport: { deleteMany: vi.fn() },
      };
      const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
      return { tx, repository: new ItemRepository(prisma as unknown as PrismaService) };
    }

    it('closes price reports once the price changes', async () => {
      const { tx, repository } = prismaWith({ ...row, listPriceValue: { toNumber: () => 60 } });
      await repository.update('i1', { listPrice: { value: 68.5, currency: 'ILS' as const } }, 'w1');
      expect(tx.itemReport.deleteMany).toHaveBeenCalledWith({
        where: { itemId: 'i1', kind: 'price' },
      });
    });

    it('keeps the reports through an edit that leaves the prices as they were', async () => {
      const { tx, repository } = prismaWith(row);
      await repository.update('i1', { listPrice: { value: 68.5, currency: 'ILS' as const } }, 'w1');
      expect(tx.itemReport.deleteMany).not.toHaveBeenCalled();
    });

    it('returns null for an unknown item', async () => {
      const { repository } = prismaWith(null);
      await expect(repository.update('i1', { listPrice: null }, 'w1')).resolves.toBeNull();
    });

    it('puts an item moved to another section at its end', async () => {
      const { tx, repository } = prismaWith(row);
      await repository.update('i1', { sectionId: 's2' }, 'w1');
      expect(tx.item.updateMany).toHaveBeenCalledWith({
        where: { id: 'i1', state: { in: ['pending', 'approved'] } },
        data: { sectionId: 's2', position: 5 },
      });
    });

    it('keeps the position when the section does not change', async () => {
      const { tx, repository } = prismaWith(row);
      await repository.update(
        'i1',
        {
          sectionId: 's1',
          listPrice: { value: 70, currency: 'ILS' as const },
        },
        'w1',
      );
      expect(tx.item.updateMany).toHaveBeenCalledWith({
        where: { id: 'i1', state: { in: ['pending', 'approved'] } },
        data: { sectionId: 's1', listPriceValue: 70, listPriceCurrency: 'ILS' },
      });
    });

    it('clears the price and description', async () => {
      const { tx, repository } = prismaWith(row);
      await repository.update('i1', { listPrice: null, description: null }, 'w1');
      expect(tx.item.updateMany).toHaveBeenCalledWith({
        where: { id: 'i1', state: { in: ['pending', 'approved'] } },
        data: { description: DbNull, listPriceValue: null, listPriceCurrency: null },
      });
    });

    it('replaces the tags in the given order', async () => {
      const { tx, repository } = prismaWith(row, [{ id: 't1' }, { id: 't2' }]);
      await repository.update('i1', { tagIds: ['t2', 't1'] }, 'w1');
      expect(tx.item.updateMany).toHaveBeenCalledWith({
        where: { id: 'i1', state: { in: ['pending', 'approved'] } },
        data: { tagIds: ['t2', 't1'] },
      });
    });

    it('refuses a tag that no longer exists', async () => {
      const { tx, repository } = prismaWith(row, [{ id: 't1' }]);
      await expect(repository.update('i1', { tagIds: ['t1', 't2'] }, 'w1')).rejects.toThrow(
        UnknownTagError,
      );
      expect(tx.item.updateMany).not.toHaveBeenCalled();
      expect(tx.itemRevision.create).not.toHaveBeenCalled();
    });

    it('replaces the variations and checks their tags', async () => {
      const { tx, repository } = prismaWith(row, [{ id: 't1' }, { id: veganTag }]);
      await repository.update('i1', { tagIds: ['t1'], variations: [vegan] }, 'w1');
      expect(tx.$queryRaw.mock.calls[0]?.slice(1)).toEqual([['t1', veganTag]]);
      expect(tx.item.updateMany).toHaveBeenCalledWith({
        where: { id: 'i1', state: { in: ['pending', 'approved'] } },
        data: { tagIds: ['t1'], variations: [vegan] },
      });
    });

    it('refuses a variation tag that no longer exists', async () => {
      const { tx, repository } = prismaWith(row, []);
      await expect(repository.update('i1', { variations: [vegan] }, 'w1')).rejects.toThrow(
        UnknownTagError,
      );
      expect(tx.item.updateMany).not.toHaveBeenCalled();
    });

    it('records the edit with the item as it is afterwards', async () => {
      const { tx, repository } = prismaWith(row);
      await repository.update('i1', { listPrice: { value: 68.5, currency: 'ILS' as const } }, 'w1');
      expect(tx.itemRevision.create).toHaveBeenCalledWith({
        data: { itemId: 'i1', kind: 'updated', snapshot, changedById: 'w1' },
      });
    });

    it('refuses an edit that lost a race with an archive or a rejection', async () => {
      const { tx, repository } = prismaWith(row, [], 0);
      await expect(repository.update('i1', { listPrice: null }, 'w1')).rejects.toThrow(
        ItemNotEditableError,
      );
      expect(tx.itemRevision.create).not.toHaveBeenCalled();
    });

    it('records nothing for an unknown item', async () => {
      const { tx, repository } = prismaWith(null);
      await repository.update('i1', { listPrice: null }, 'w1');
      expect(tx.itemRevision.create).not.toHaveBeenCalled();
    });
  });
});
