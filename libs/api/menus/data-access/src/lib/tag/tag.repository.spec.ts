import { type PrismaService } from '@menu/api/shared/db';
import { TagRepository } from './tag.repository';

describe('TagRepository', () => {
  const row = { id: 't1', slug: 'hamburger', nameHe: 'המבורגר', nameEn: 'Hamburger', kind: 'dish' };
  const tag = {
    id: 't1',
    slug: 'hamburger',
    name: { he: 'המבורגר', en: 'Hamburger' },
    kind: 'dish',
  };

  function repositoryWith(model: Record<string, unknown>): TagRepository {
    return new TagRepository({ tag: model } as unknown as PrismaService);
  }

  it('lists the vocabulary', async () => {
    const repository = repositoryWith({ findMany: vi.fn().mockResolvedValue([row]) });
    await expect(repository.list()).resolves.toEqual([tag]);
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
        tag: { count: vi.fn().mockResolvedValue(tagCount), delete: vi.fn() },
        itemTag: {
          findMany: vi
            .fn()
            .mockResolvedValueOnce([
              { itemId: 'a', tagId: 'old', position: 0 },
              { itemId: 'b', tagId: 'old', position: 0 },
            ])
            .mockResolvedValueOnce([{ itemId: 'b', tagId: 'new', position: 2 }]),
          createMany: vi.fn(),
          update: vi.fn(),
        },
      };
      const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
      return { tx, repository: new TagRepository(prisma as unknown as PrismaService) };
    }

    it('moves items to the target tag and deletes the old one', async () => {
      const { tx, repository } = prismaWith(2);
      await expect(repository.merge('old', 'new')).resolves.toBe(true);
      expect(tx.itemTag.createMany).toHaveBeenCalledWith({
        data: [{ itemId: 'a', tagId: 'new', position: 0 }],
      });
      expect(tx.tag.delete).toHaveBeenCalledWith({ where: { id: 'old' } });
    });

    it('keeps a merged primary tag primary on items that had both', async () => {
      const { tx, repository } = prismaWith(2);
      await repository.merge('old', 'new');
      expect(tx.itemTag.update).toHaveBeenCalledWith({
        where: { itemId_tagId: { itemId: 'b', tagId: 'new' } },
        data: { position: 0 },
      });
    });

    it('changes nothing when a tag is missing', async () => {
      const { tx, repository } = prismaWith(1);
      await expect(repository.merge('old', 'new')).resolves.toBe(false);
      expect(tx.tag.delete).not.toHaveBeenCalled();
    });
  });
});
