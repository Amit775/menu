import { type PrismaService } from '@menu/api/shared/db';
import { DiscoverRepository } from './discover.repository';

describe('DiscoverRepository', () => {
  function repositoryWith(prisma: Record<string, unknown>): DiscoverRepository {
    return new DiscoverRepository(prisma as unknown as PrismaService);
  }

  it('loads approved and archived items of active venues with ordered tags', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        id: 'i1',
        nameHe: 'המבורגר',
        nameEn: null,
        state: 'approved',
        venueId: 'v1',
        venue: { nameHe: 'משה', nameEn: 'Moshe', lat: 32.08, lng: 34.78 },
        sectionId: 's1',
        position: 0,
        tags: [{ tagId: 't1' }],
        listPrice: 6800,
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
      },
    ]);
    const items = await repositoryWith({ item: { findMany } }).loadCatalog();
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { state: { in: ['approved', 'archived'] }, venue: { status: 'active' } },
    });
    expect(items[0]).toMatchObject({
      name: { he: 'המבורגר' },
      venueName: { he: 'משה', en: 'Moshe' },
      venueLocation: { lat: 32.08, lng: 34.78 },
      tagIds: ['t1'],
    });
  });

  it('never reads hidden entries into scores', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    await repositoryWith({ entry: { findMany } }).loadEntryFacts(['i1']);
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { itemId: { in: ['i1'] }, hiddenAt: null },
    });
  });

  it('finds the items an author wrote about', async () => {
    const findMany = vi.fn().mockResolvedValue([{ itemId: 'i1' }, { itemId: 'i2' }]);
    await expect(repositoryWith({ entry: { findMany } }).itemIdsWrittenBy('a1')).resolves.toEqual(
      new Set(['i1', 'i2']),
    );
  });

  it('treats a hidden venue as missing', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    await expect(
      repositoryWith({ venue: { findFirst } }).findActiveVenue('v1'),
    ).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'v1', status: 'active' } });
  });
});
