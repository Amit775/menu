import { type PrismaService } from '@menu/api/shared/db';
import { MenuSectionRepository } from './menu-section.repository';

describe('MenuSectionRepository', () => {
  const venueId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
  const row = { id: 's1', venueId, nameHe: 'עיקריות', nameEn: 'Mains', position: 2 };
  const section = { id: 's1', venueId, name: { he: 'עיקריות', en: 'Mains' }, position: 2 };

  it('lists a venue’s sections in menu order', async () => {
    const findMany = vi.fn().mockResolvedValue([row]);
    const repository = new MenuSectionRepository({
      menuSection: { findMany },
    } as unknown as PrismaService);
    await expect(repository.listByVenue(venueId)).resolves.toEqual([section]);
    expect(findMany).toHaveBeenCalledWith({ where: { venueId }, orderBy: { position: 'asc' } });
  });

  it('appends a new section after the last one', async () => {
    const create = vi.fn().mockResolvedValue({ ...row, position: 3 });
    const tx = {
      menuSection: { aggregate: vi.fn().mockResolvedValue({ _max: { position: 2 } }), create },
    };
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    const repository = new MenuSectionRepository(prisma as unknown as PrismaService);
    await expect(repository.create(venueId, { he: 'קינוחים' })).resolves.toMatchObject({
      position: 3,
    });
    expect(create).toHaveBeenCalledWith({
      data: { venueId, nameHe: 'קינוחים', nameEn: null, position: 3 },
    });
  });

  it('returns null when renaming a section of another venue', async () => {
    const repository = new MenuSectionRepository({
      menuSection: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    } as unknown as PrismaService);
    await expect(repository.rename(venueId, 's1', { he: 'x' })).resolves.toBeNull();
  });
});
