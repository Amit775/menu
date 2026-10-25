import { DbNull, type PrismaService } from '@menu/api/shared/db';
import { ItemRepository, UnknownTagError } from './item.repository';

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
    state: 'approved' as const,
    submittedById: null,
    mergedIntoId: null,
    position: 0,
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
    state: 'approved',
    mergedIntoId: null,
    submittedById: null,
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

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

  it('appends a new item to its section with ordered tags', async () => {
    const create = vi.fn().mockResolvedValue(row);
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 't1' }, { id: 't2' }]),
      item: { aggregate: vi.fn().mockResolvedValue({ _max: { position: 4 } }), create },
    };
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    const repository = new ItemRepository(prisma as unknown as PrismaService);
    await repository.create({
      venueId,
      sectionId: 's1',
      name: { he: 'המבורגר', en: null },
      description: { he: 'קציצת בקר', en: null },
      listPrice: { value: 68.5, currency: 'ILS' as const },
      tagIds: ['t1', 't2'],
      state: 'pending',
      submittedById: 'u1',
    });
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

  it('refuses a tag that was merged away before the write', async () => {
    const create = vi.fn();
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 't1' }]),
      item: { aggregate: vi.fn().mockResolvedValue({ _max: { position: 4 } }), create },
    };
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    const repository = new ItemRepository(prisma as unknown as PrismaService);
    await expect(
      repository.create({
        venueId,
        sectionId: 's1',
        name: { he: 'המבורגר', en: null },
        description: null,
        listPrice: null,
        tagIds: ['t1', 't2'],
        state: 'approved',
        submittedById: null,
      }),
    ).rejects.toThrow(UnknownTagError);
    expect(create).not.toHaveBeenCalled();
    expect(tx.$queryRaw.mock.calls[0]?.[0]).toEqual(
      expect.arrayContaining([expect.stringContaining('FOR SHARE')]),
    );
  });

  it('only transitions an item that is still in the expected state', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const repository = new ItemRepository({ item: { updateMany } } as unknown as PrismaService);
    await expect(repository.transition('i1', 'pending', 'approved')).resolves.toBeNull();
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'i1', state: 'pending' },
      data: { state: 'approved', mergedIntoId: null },
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
    function prismaWith(current: unknown, tags: { id: string }[] = []) {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue(tags),
        item: {
          findUnique: vi.fn().mockResolvedValue(current),
          aggregate: vi.fn().mockResolvedValue({ _max: { position: 4 } }),
          update: vi.fn().mockResolvedValue({}),
          findUniqueOrThrow: vi.fn().mockResolvedValue(row),
        },
      };
      const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
      return { tx, repository: new ItemRepository(prisma as unknown as PrismaService) };
    }

    it('returns null for an unknown item', async () => {
      const { repository } = prismaWith(null);
      await expect(repository.update('i1', { listPrice: null })).resolves.toBeNull();
    });

    it('puts an item moved to another section at its end', async () => {
      const { tx, repository } = prismaWith({ sectionId: 's1' });
      await repository.update('i1', { sectionId: 's2' });
      expect(tx.item.update).toHaveBeenCalledWith({
        where: { id: 'i1' },
        data: { sectionId: 's2', position: 5 },
      });
    });

    it('keeps the position when the section does not change', async () => {
      const { tx, repository } = prismaWith({ sectionId: 's1' });
      await repository.update('i1', {
        sectionId: 's1',
        listPrice: { value: 70, currency: 'ILS' as const },
      });
      expect(tx.item.update).toHaveBeenCalledWith({
        where: { id: 'i1' },
        data: { sectionId: 's1', listPriceValue: 70, listPriceCurrency: 'ILS' },
      });
    });

    it('clears the price and description', async () => {
      const { tx, repository } = prismaWith({ sectionId: 's1' });
      await repository.update('i1', { listPrice: null, description: null });
      expect(tx.item.update).toHaveBeenCalledWith({
        where: { id: 'i1' },
        data: { description: DbNull, listPriceValue: null, listPriceCurrency: null },
      });
    });

    it('replaces the tags in the given order', async () => {
      const { tx, repository } = prismaWith({ sectionId: 's1' }, [{ id: 't1' }, { id: 't2' }]);
      await repository.update('i1', { tagIds: ['t2', 't1'] });
      expect(tx.item.update).toHaveBeenCalledWith({
        where: { id: 'i1' },
        data: { tagIds: ['t2', 't1'] },
      });
    });

    it('refuses a tag that no longer exists', async () => {
      const { tx, repository } = prismaWith({ sectionId: 's1' }, [{ id: 't1' }]);
      await expect(repository.update('i1', { tagIds: ['t1', 't2'] })).rejects.toThrow(
        UnknownTagError,
      );
      expect(tx.item.update).not.toHaveBeenCalled();
    });
  });
});
