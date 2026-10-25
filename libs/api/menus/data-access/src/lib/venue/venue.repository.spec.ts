import { type PrismaService } from '@menu/api/shared/db';
import { VenueRepository } from './venue.repository';

describe('VenueRepository', () => {
  const row = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'בורגר 24', en: null },
    address: { he: 'אבן גבירול 112', en: null },
    lat: 32.08,
    lng: 34.78,
    phone: null,
    reservationUrl: null,
    status: 'active' as const,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const venue = {
    id: row.id,
    name: { he: 'בורגר 24', en: null },
    address: { he: 'אבן גבירול 112', en: null },
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

  it('lists venues by their Hebrew name', async () => {
    const findMany = vi.fn().mockResolvedValue([
      { ...row, id: 'b', name: { he: 'בית', en: null } },
      { ...row, id: 'a', name: { he: 'אלף', en: null } },
    ]);
    const venues = await repositoryWith({ findMany }).list({ includeHidden: true });
    expect(venues.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('filters by ids', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    await repositoryWith({ findMany }).list({ ids: ['a'], includeHidden: true });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['a'] } } }),
    );
  });

  it('rejects a stored name that is not Text', async () => {
    const findUnique = vi.fn().mockResolvedValue({ ...row, name: { en: 'Burger 24' } });
    await expect(repositoryWith({ findUnique }).findById(row.id)).rejects.toThrow();
  });

  it('creates a venue with its sections in order, each with its own id', async () => {
    const create = vi.fn().mockResolvedValue(row);
    await repositoryWith({ create }).create(
      {
        name: { he: 'בורגר 24', en: null },
        address: row.address,
        location: { lat: 32.08, lng: 34.78 },
        phone: null,
        reservationUrl: null,
        sections: [
          { he: 'עיקריות', en: null },
          { he: 'שתייה', en: 'Drinks' },
        ],
      },
      'admin-id',
    );
    const [{ data }] = create.mock.calls[0] as [{ data: { sections: { id: string }[] } }];
    expect(data).toMatchObject({
      name: { he: 'בורגר 24', en: null },
      address: row.address,
      createdById: 'admin-id',
      sections: [
        { id: expect.any(String) as string, name: { he: 'עיקריות', en: null } },
        { id: expect.any(String) as string, name: { he: 'שתייה', en: 'Drinks' } },
      ],
    });
    expect(data.sections[0]?.id).not.toBe(data.sections[1]?.id);
  });

  it('maps a partial update to columns', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const repository = repositoryWith({ updateMany, findUnique: vi.fn().mockResolvedValue(row) });
    await repository.update(row.id, {
      name: { he: 'חדש', en: null },
      location: { lat: 1, lng: 2 },
      status: 'hidden',
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: row.id },
      data: { name: { he: 'חדש', en: null }, status: 'hidden', lat: 1, lng: 2 },
    });
  });

  it('returns null when updating an unknown venue', async () => {
    const repository = repositoryWith({ updateMany: vi.fn().mockResolvedValue({ count: 0 }) });
    await expect(repository.update(row.id, { status: 'hidden' })).resolves.toBeNull();
  });
});
