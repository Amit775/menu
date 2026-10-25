import { type PrismaService } from '@menu/api/shared/db';
import { MenuSectionRepository } from './menu-section.repository';

describe('MenuSectionRepository', () => {
  const venueId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
  const mains = {
    id: '1b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'עיקריות', en: 'Mains' },
  };
  const drinks = { id: '2b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10', name: { he: 'שתייה', en: null } };

  function repositoryWith(sections: unknown) {
    const update = vi.fn().mockResolvedValue({});
    const venue = {
      findUnique: vi.fn().mockResolvedValue(sections === null ? null : { sections }),
      update,
    };
    const tx = {
      venue,
      $queryRaw: vi.fn().mockResolvedValue(sections === null ? [] : [{ sections }]),
    };
    const prisma = { venue, $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    return {
      repository: new MenuSectionRepository(prisma as unknown as PrismaService),
      update,
      tx,
    };
  }

  it('lists a venue’s sections in menu order', async () => {
    const { repository } = repositoryWith([mains, drinks]);
    await expect(repository.listByVenue(venueId)).resolves.toEqual([
      { ...mains, venueId, position: 0 },
      { ...drinks, venueId, position: 1 },
    ]);
  });

  it('lists nothing for an unknown venue', async () => {
    const { repository } = repositoryWith(null);
    await expect(repository.listByVenue(venueId)).resolves.toEqual([]);
  });

  it('rejects stored sections that are not valid', async () => {
    const { repository } = repositoryWith([{ id: 'x', name: { he: 'עיקריות', en: null } }]);
    await expect(repository.listByVenue(venueId)).rejects.toThrow();
  });

  it('appends a new section after the last one, holding the venue row', async () => {
    const { repository, update, tx } = repositoryWith([mains]);
    const created = await repository.create(venueId, { he: 'קינוחים', en: null });
    expect(created).toMatchObject({ venueId, name: { he: 'קינוחים', en: null }, position: 1 });
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith({
      where: { id: venueId },
      data: { sections: [mains, { id: created?.id, name: { he: 'קינוחים', en: null } }] },
    });
  });

  it('adds no section to a venue deleted meanwhile', async () => {
    const { repository, update } = repositoryWith(null);
    await expect(repository.create(venueId, { he: 'קינוחים', en: null })).resolves.toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('renames a section in place', async () => {
    const { repository, update } = repositoryWith([mains, drinks]);
    await expect(
      repository.rename(venueId, drinks.id, { he: 'משקאות', en: null }),
    ).resolves.toEqual({
      id: drinks.id,
      venueId,
      name: { he: 'משקאות', en: null },
      position: 1,
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: venueId },
      data: { sections: [mains, { id: drinks.id, name: { he: 'משקאות', en: null } }] },
    });
  });

  it('returns null when renaming a section of another venue', async () => {
    const { repository, update } = repositoryWith([mains]);
    await expect(repository.rename(venueId, drinks.id, { he: 'x', en: null })).resolves.toBeNull();
    expect(update).not.toHaveBeenCalled();
  });

  it('reorders the sections', async () => {
    const { repository, update } = repositoryWith([mains, drinks]);
    await expect(repository.reorder(venueId, [drinks.id, mains.id])).resolves.toMatchObject([
      { id: drinks.id, position: 0 },
      { id: mains.id, position: 1 },
    ]);
    expect(update).toHaveBeenCalledWith({
      where: { id: venueId },
      data: { sections: [drinks, mains] },
    });
  });

  it('tells whether a section is on a venue’s menu', async () => {
    const { repository } = repositoryWith([mains]);
    await expect(repository.belongsTo(mains.id, venueId)).resolves.toBe(true);
    await expect(repository.belongsTo(drinks.id, venueId)).resolves.toBe(false);
  });
});
