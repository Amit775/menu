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

  it('merges a tag without duplicating it on items that already have the target', async () => {
    const create = vi.fn();
    const deleteTag = vi.fn();
    const tx = {
      itemTag: {
        findMany: vi.fn().mockResolvedValue([
          { itemId: 'a', tagId: 'old', position: 0 },
          { itemId: 'b', tagId: 'old', position: 1 },
        ]),
        count: vi
          .fn()
          .mockImplementation(({ where }: { where: { itemId: string } }) =>
            Promise.resolve(where.itemId === 'b' ? 1 : 0),
          ),
        create,
      },
      tag: { delete: deleteTag },
    };
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    await new ItemRepository(prisma as unknown as PrismaService).mergeTag('old', 'new');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({ data: { itemId: 'a', tagId: 'new', position: 0 } });
    expect(deleteTag).toHaveBeenCalledWith({ where: { id: 'old' } });
  });
});
