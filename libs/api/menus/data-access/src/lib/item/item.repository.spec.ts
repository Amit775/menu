import { type PrismaService } from '@menu/api/shared/db';
import { ItemRepository } from './item.repository';

describe('ItemRepository', () => {
  const venueId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
  const row = {
    id: 'i1',
    venueId,
    sectionId: 's1',
    nameHe: 'המבורגר',
    nameEn: null,
    listPrice: 6800,
    state: 'approved' as const,
    submittedById: null,
    mergedIntoId: null,
    position: 0,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    tags: [{ tagId: 't1' }, { tagId: 't2' }],
  };
  const record = {
    id: 'i1',
    venueId,
    sectionId: 's1',
    name: { he: 'המבורגר' },
    listPrice: 6800,
    tagIds: ['t1', 't2'],
    state: 'approved',
    mergedIntoId: null,
    submittedById: null,
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('maps rows with their tags in order', async () => {
    const findUnique = vi.fn().mockResolvedValue(row);
    const repository = new ItemRepository({ item: { findUnique } } as unknown as PrismaService);
    await expect(repository.findById('i1')).resolves.toEqual(record);
  });

  it("lists the menu plus the caller's own submissions", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = new ItemRepository({ item: { findMany } } as unknown as PrismaService);
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

  it('appends a new item to its section with ordered tags', async () => {
    const create = vi.fn().mockResolvedValue(row);
    const tx = {
      item: { aggregate: vi.fn().mockResolvedValue({ _max: { position: 4 } }), create },
    };
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    const repository = new ItemRepository(prisma as unknown as PrismaService);
    await repository.create({
      venueId,
      sectionId: 's1',
      name: { he: 'המבורגר' },
      listPrice: 6800,
      tagIds: ['t1', 't2'],
      state: 'pending',
      submittedById: 'u1',
    });
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        position: 5,
        state: 'pending',
        submittedById: 'u1',
        tags: {
          create: [
            { tagId: 't1', position: 0 },
            { tagId: 't2', position: 1 },
          ],
        },
      },
    });
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
    function prismaWith(current: unknown) {
      const tx = {
        item: {
          findUnique: vi.fn().mockResolvedValue(current),
          aggregate: vi.fn().mockResolvedValue({ _max: { position: 4 } }),
          update: vi.fn().mockResolvedValue({}),
          findUniqueOrThrow: vi.fn().mockResolvedValue(row),
        },
        itemTag: { deleteMany: vi.fn(), createMany: vi.fn() },
      };
      const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
      return { tx, repository: new ItemRepository(prisma as unknown as PrismaService) };
    }

    it('returns null for an unknown item', async () => {
      const { repository } = prismaWith(null);
      await expect(repository.update('i1', { listPrice: 1 })).resolves.toBeNull();
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
      await repository.update('i1', { sectionId: 's1', listPrice: 7000 });
      expect(tx.item.update).toHaveBeenCalledWith({
        where: { id: 'i1' },
        data: { sectionId: 's1', listPrice: 7000 },
      });
    });

    it('replaces the tags in the given order', async () => {
      const { tx, repository } = prismaWith({ sectionId: 's1' });
      await repository.update('i1', { tagIds: ['t2', 't1'] });
      expect(tx.itemTag.deleteMany).toHaveBeenCalledWith({ where: { itemId: 'i1' } });
      expect(tx.itemTag.createMany).toHaveBeenCalledWith({
        data: [
          { itemId: 'i1', tagId: 't2', position: 0 },
          { itemId: 'i1', tagId: 't1', position: 1 },
        ],
      });
    });
  });
});
