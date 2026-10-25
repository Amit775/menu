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
        name: { he: 'המבורגר', en: null },
        state: 'approved',
        venueId: 'v1',
        venue: { name: { he: 'משה', en: 'Moshe' }, lat: 32.08, lng: 34.78 },
        sectionId: 's1',
        position: 0,
        tagIds: ['t1'],
        listPriceValue: { toNumber: () => 68 },
        listPriceCurrency: 'ILS',
        createdAt: new Date('2026-10-01T00:00:00.000Z'),
      },
    ]);
    const items = await repositoryWith({ item: { findMany } }).loadCatalog();
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { state: { in: ['approved', 'archived'] }, venue: { status: 'active' } },
    });
    expect(items[0]).toMatchObject({
      name: { he: 'המבורגר', en: null },
      venueName: { he: 'משה', en: 'Moshe' },
      venueLocation: { lat: 32.08, lng: 34.78 },
      tagIds: ['t1'],
      listPrice: { value: 68, currency: 'ILS' as const },
    });
  });

  it('reads a venue’s sections in menu order', async () => {
    const sections = [
      { id: '2b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10', name: { he: 'שתייה', en: null } },
      { id: '1b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10', name: { he: 'עיקריות', en: null } },
    ];
    const findUnique = vi.fn().mockResolvedValue({ sections });
    await expect(repositoryWith({ venue: { findUnique } }).listSections('v1')).resolves.toEqual([
      { ...sections[0], venueId: 'v1', position: 0 },
      { ...sections[1], venueId: 'v1', position: 1 },
    ]);
  });

  it('treats a hidden venue as missing', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    await expect(
      repositoryWith({ venue: { findFirst } }).findActiveVenue('v1'),
    ).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledWith({ where: { id: 'v1', status: 'active' } });
  });
});
