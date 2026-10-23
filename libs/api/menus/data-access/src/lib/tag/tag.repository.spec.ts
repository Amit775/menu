import { type PrismaService } from '@menu/api/shared/db';
import { TagRepository } from './tag.repository';

describe('TagRepository', () => {
  const row = { id: 't1', slug: 'hamburger', nameHe: 'המבורגר', nameEn: 'Hamburger', kind: 'dish' };
  const tag = { id: 't1', slug: 'hamburger', name: { he: 'המבורגר', en: 'Hamburger' }, kind: 'dish' };

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
});
