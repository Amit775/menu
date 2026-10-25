import { type PrismaService } from '@menu/api/shared/db';
import { TagRepository } from './tag.repository';

describe('TagRepository', () => {
  const row = {
    id: 't1',
    slug: 'hamburger',
    name: { he: 'המבורגר', en: 'Hamburger' },
    kind: 'dish',
  };
  const tag = {
    id: 't1',
    slug: 'hamburger',
    name: { he: 'המבורגר', en: 'Hamburger' },
    kind: 'dish',
  };

  function repositoryWith(model: Record<string, unknown>): TagRepository {
    return new TagRepository({ tag: model } as unknown as PrismaService);
  }

  it('lists the vocabulary by kind, then by Hebrew name', async () => {
    const vegan = { ...row, id: 't2', name: { he: 'טבעוני', en: null }, kind: 'diet' };
    const burger = { ...row, id: 't3', name: { he: 'בורגר', en: null } };
    const findMany = vi.fn().mockResolvedValue([row, vegan, burger]);
    const repository = repositoryWith({ findMany });
    const tags = await repository.list();
    expect(tags[0]).toEqual({ ...tag, id: 't3', name: { he: 'בורגר', en: null } });
    expect(tags.map((item) => item.id)).toEqual(['t3', 't1', 't2']);
  });

  it('creates a tag with its Text name', async () => {
    const create = vi.fn().mockResolvedValue(row);
    await repositoryWith({ create }).create({ slug: 'hamburger', name: tag.name, kind: 'dish' });
    expect(create).toHaveBeenCalledWith({
      data: { slug: 'hamburger', kind: 'dish', name: tag.name },
    });
  });

  it('creates a tag', async () => {
    const create = vi.fn().mockResolvedValue(row);
    await expect(
      repositoryWith({ create }).create({ slug: 'hamburger', name: tag.name, kind: 'dish' }),
    ).resolves.toEqual(tag);
  });

  it('returns null for a taken slug', async () => {
    const repository = repositoryWith({ create: vi.fn().mockRejectedValue({ code: 'P2002' }) });
    await expect(
      repository.create({ slug: 'hamburger', name: tag.name, kind: 'dish' }),
    ).resolves.toBeNull();
  });

  it('rethrows other errors', async () => {
    const repository = repositoryWith({ create: vi.fn().mockRejectedValue(new Error('down')) });
    await expect(
      repository.create({ slug: 'hamburger', name: tag.name, kind: 'dish' }),
    ).rejects.toThrow('down');
  });

  it('returns null when updating an unknown tag', async () => {
    const repository = repositoryWith({ updateMany: vi.fn().mockResolvedValue({ count: 0 }) });
    await expect(repository.update('t1', { kind: 'diet' })).resolves.toBeNull();
  });

  describe('merge', () => {
    function prismaWith(tagCount: number) {
      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([{ id: 'old' }, { id: 'new' }].slice(0, tagCount)),
        tag: { delete: vi.fn() },
        item: {
          findMany: vi.fn().mockResolvedValue([
            { id: 'a', tagIds: ['old', 'x'] },
            { id: 'b', tagIds: ['old', 'x', 'new'] },
            { id: 'c', tagIds: ['new', 'old'] },
          ]),
          update: vi.fn(),
        },
      };
      const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
      return { tx, repository: new TagRepository(prisma as unknown as PrismaService) };
    }

    it('moves items to the target tag and deletes the old one', async () => {
      const { tx, repository } = prismaWith(2);
      await expect(repository.merge('old', 'new')).resolves.toBe(true);
      expect(tx.$queryRaw.mock.calls[0]?.[0]).toEqual(
        expect.arrayContaining([expect.stringContaining('FOR UPDATE')]),
      );
      expect(tx.item.findMany).toHaveBeenCalledWith({
        where: { tagIds: { has: 'old' } },
        select: { id: true, tagIds: true },
      });
      expect(tx.item.update).toHaveBeenCalledWith({
        where: { id: 'a' },
        data: { tagIds: ['new', 'x'] },
      });
      expect(tx.tag.delete).toHaveBeenCalledWith({ where: { id: 'old' } });
    });

    it('keeps the better position on items that had both', async () => {
      const { tx, repository } = prismaWith(2);
      await repository.merge('old', 'new');
      expect(tx.item.update).toHaveBeenCalledWith({
        where: { id: 'b' },
        data: { tagIds: ['new', 'x'] },
      });
      expect(tx.item.update).toHaveBeenCalledWith({
        where: { id: 'c' },
        data: { tagIds: ['new'] },
      });
    });

    it('changes nothing when a tag is missing', async () => {
      const { tx, repository } = prismaWith(1);
      await expect(repository.merge('old', 'new')).resolves.toBe(false);
      expect(tx.item.update).not.toHaveBeenCalled();
      expect(tx.tag.delete).not.toHaveBeenCalled();
    });
  });
});
