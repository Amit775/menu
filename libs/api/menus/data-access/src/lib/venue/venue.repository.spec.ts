import { type PrismaService } from '@menu/api/shared/db';
import { VenueRepository } from './venue.repository';

describe('VenueRepository', () => {
  const row = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    nameHe: 'בורגר 24',
    nameEn: null,
    address: 'אבן גבירול 112',
    lat: 32.08,
    lng: 34.78,
    phone: null,
    reservationUrl: null,
    status: 'active' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const venue = {
    id: row.id,
    name: { he: 'בורגר 24' },
    address: 'אבן גבירול 112',
    location: { lat: 32.08, lng: 34.78 },
    phone: null,
    reservationUrl: null,
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  function repositoryWith(model: Record<string, unknown>): VenueRepository {
    return new VenueRepository({ venue: model } as unknown as PrismaService);
  }

  it('lists active venues only unless hidden ones are asked for', async () => {
    const findMany = vi.fn().mockResolvedValue([row]);
    await expect(repositoryWith({ findMany }).list({ includeHidden: false })).resolves.toEqual([
      venue,
    ]);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'active' } }));
  });

  it('filters by ids', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    await repositoryWith({ findMany }).list({ ids: ['a'], includeHidden: true });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['a'] } } }));
  });

  it('creates a venue with its sections in order', async () => {
    const create = vi.fn().mockResolvedValue(row);
    await repositoryWith({ create }).create(
      {
        name: { he: 'בורגר 24' },
        address: row.address,
        location: { lat: 32.08, lng: 34.78 },
        phone: null,
        reservationUrl: null,
        sections: [{ he: 'עיקריות' }, { he: 'שתייה', en: 'Drinks' }],
      },
      'admin-id',
    );
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      data: {
        nameHe: 'בורגר 24',
        nameEn: null,
        createdById: 'admin-id',
        sections: {
          create: [
            { nameHe: 'עיקריות', nameEn: null, position: 0 },
            { nameHe: 'שתייה', nameEn: 'Drinks', position: 1 },
          ],
        },
      },
    });
  });

  it('maps a partial update to columns', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const repository = repositoryWith({ updateMany, findUnique: vi.fn().mockResolvedValue(row) });
    await repository.update(row.id, { location: { lat: 1, lng: 2 }, status: 'hidden' });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: row.id },
      data: { status: 'hidden', lat: 1, lng: 2 },
    });
  });

  it('returns null when updating an unknown venue', async () => {
    const repository = repositoryWith({ updateMany: vi.fn().mockResolvedValue({ count: 0 }) });
    await expect(repository.update(row.id, { status: 'hidden' })).resolves.toBeNull();
  });
});
