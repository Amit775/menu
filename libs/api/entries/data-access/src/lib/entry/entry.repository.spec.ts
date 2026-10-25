import { DbNull, type PrismaService } from '@menu/api/shared/db';
import { EntryRepository } from './entry.repository';

describe('EntryRepository', () => {
  const row = {
    id: 'e1',
    authorId: 'a1',
    itemId: 'i1',
    eatenAt: new Date('2026-10-20T19:30:00.000Z'),
    rating: 4,
    wouldOrderAgain: true,
    pricePaidValue: { toNumber: () => 68 },
    pricePaidCurrency: 'ILS',
    text: 'טעים',
    visibility: 'private',
    shareToken: null,
    hiddenAt: null,
    photo: null,
    createdAt: new Date('2026-10-20T20:00:00.000Z'),
    updatedAt: new Date('2026-10-20T20:00:00.000Z'),
    item: { venueId: 'v1' },
  };
  const withVenue = { item: { select: { venueId: true } } };

  function repositoryWith(
    entry: Record<string, unknown>,
    raw: Record<string, unknown> = {},
  ): EntryRepository {
    const prisma: Record<string, unknown> = { entry, ...raw };
    prisma['$transaction'] = (work: unknown) =>
      typeof work === 'function'
        ? (work as (tx: unknown) => unknown)(prisma)
        : Promise.all(work as Promise<unknown>[]);
    return new EntryRepository(prisma as unknown as PrismaService);
  }

  it('maps a row to a record, with the hidden flag', async () => {
    const findUnique = vi.fn().mockResolvedValue({ ...row, hiddenAt: new Date() });
    await expect(repositoryWith({ findUnique }).findById('e1')).resolves.toMatchObject({
      id: 'e1',
      authorId: 'a1',
      eatenAt: '2026-10-20T19:30:00.000Z',
      venueId: 'v1',
      pricePaid: { value: 68, currency: 'ILS' as const },
      hidden: true,
      photoUrl: null,
    });
  });

  it('lists a diary for one venue, newest first', async () => {
    const findMany = vi.fn().mockResolvedValue([row]);
    await repositoryWith({ findMany }).listByAuthor('a1', { venueId: 'v1' });
    expect(findMany).toHaveBeenCalledWith({
      where: { authorId: 'a1', item: { venueId: 'v1' } },
      orderBy: [{ eatenAt: 'desc' }, { createdAt: 'desc' }],
      include: withVenue,
    });
  });

  it('lists only public, unhidden entries of other authors', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    await repositoryWith({ findMany }).listPublicByItem('i1', 'a1');
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { itemId: 'i1', visibility: 'public', hiddenAt: null, authorId: { not: 'a1' } },
    });
  });

  it('updates only the author’s own entry', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    await expect(
      repositoryWith({ updateMany }).update('e1', 'a2', { rating: 5 }),
    ).resolves.toBeNull();
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'e1', authorId: 'a2' },
      data: { rating: 5 },
    });
  });

  it('writes a price paid as its two columns', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const findUniqueOrThrow = vi.fn().mockResolvedValue(row);
    await repositoryWith({ updateMany, findUniqueOrThrow }).update('e1', 'a1', {
      pricePaid: { value: 68, currency: 'ILS' as const },
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'e1', authorId: 'a1' },
      data: { pricePaidValue: 68, pricePaidCurrency: 'ILS' },
    });
  });

  it('gives the photo a new id when asked, keeping its type', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const $executeRaw = vi.fn().mockResolvedValue(1);
    await repositoryWith(
      { updateMany, findUniqueOrThrow: vi.fn().mockResolvedValue(row) },
      { $executeRaw },
    ).update('e1', 'a1', { visibility: 'public', photoId: 'newPhotoIdnewPhotoId00' });
    expect($executeRaw.mock.calls[0]?.slice(1)).toEqual(['newPhotoIdnewPhotoId00', 'e1']);
  });

  it('deletes only the author’s own entry', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    await expect(repositoryWith({ deleteMany }).delete('e1', 'a1')).resolves.toBe(true);
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'e1', authorId: 'a1' } });
  });

  it('never hides a private entry', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const $executeRaw = vi.fn().mockResolvedValue(0);
    await repositoryWith({ updateMany }, { $executeRaw }).setHidden(
      'e1',
      true,
      'newPhotoIdnewPhotoId00',
    );
    expect(updateMany.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'e1', visibility: { not: 'private' } },
    });
    expect(($executeRaw.mock.calls[0]?.[0] as string[]).join('?')).toContain(
      `"visibility" <> 'private'`,
    );
  });

  it('gives a hidden entry’s photo a new id, and leaves it on un-hide', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const $executeRaw = vi.fn().mockResolvedValue(1);
    const repository = repositoryWith({ updateMany }, { $executeRaw });
    await repository.setHidden('e1', true, 'newPhotoIdnewPhotoId00');
    expect($executeRaw.mock.calls[0]?.slice(1)).toEqual(['newPhotoIdnewPhotoId00', 'e1']);
    $executeRaw.mockClear();
    await repository.setHidden('e1', false, 'otherPhotoIdotherPhot0');
    expect($executeRaw).not.toHaveBeenCalled();
  });

  it('maps a photo to its URL', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      ...row,
      photo: { id: 'abcdefghijklmnopqrstuv', contentType: 'image/png' },
    });
    const $queryRaw = vi.fn().mockResolvedValue([{ id: 'e1' }]);
    await expect(
      repositoryWith({ findUnique }, { $queryRaw }).findByPhotoId('abcdefghijklmnopqrstuv'),
    ).resolves.toMatchObject({
      photoUrl: '/api/photos/abcdefghijklmnopqrstuv',
      photoId: 'abcdefghijklmnopqrstuv',
      photoType: 'image/png',
    });
    expect($queryRaw.mock.calls[0]?.[1]).toBe('{"id":"abcdefghijklmnopqrstuv"}');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'e1' }, include: withVenue });
  });

  it('finds no entry for an unknown photo', async () => {
    const $queryRaw = vi.fn().mockResolvedValue([]);
    await expect(repositoryWith({}, { $queryRaw }).findByPhotoId('x')).resolves.toBeNull();
  });

  it('rejects a stored photo without its type', async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValue({ ...row, photo: { id: 'abcdefghijklmnopqrstuv' } });
    await expect(repositoryWith({ findUnique }).findById('e1')).rejects.toThrow();
  });

  it('sets and clears a photo on the author’s own entry only', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const repository = repositoryWith({ updateMany });
    const photo = { photoId: 'abcdefghijklmnopqrstuv', photoType: 'image/jpeg' as const };
    await expect(repository.setPhoto('e1', 'a2', photo)).resolves.toBeNull();
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'e1', authorId: 'a2' },
      data: { photo: { id: 'abcdefghijklmnopqrstuv', contentType: 'image/jpeg' } },
    });
    await repository.setPhoto('e1', 'a2', null);
    expect(updateMany).toHaveBeenLastCalledWith({
      where: { id: 'e1', authorId: 'a2' },
      data: { photo: DbNull },
    });
  });

  it('moves entries to the item a duplicate was merged into', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    await repositoryWith({ updateMany }).moveToItem('i1', 'i2');
    expect(updateMany).toHaveBeenCalledWith({ where: { itemId: 'i1' }, data: { itemId: 'i2' } });
  });

  it('never reads hidden entries into aggregates', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    await repositoryWith({ findMany }).listFacts();
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({ where: { hiddenAt: null } });
  });

  it('reads aggregate facts with their price and photo id', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        itemId: 'i1',
        authorId: 'a1',
        rating: 4,
        wouldOrderAgain: true,
        pricePaidValue: { toNumber: () => 68 },
        pricePaidCurrency: 'ILS',
        visibility: 'public',
        photo: { id: 'abcdefghijklmnopqrstuv', contentType: 'image/png' },
        eatenAt: row.eatenAt,
        createdAt: row.createdAt,
      },
    ]);
    await expect(repositoryWith({ findMany }).listFacts()).resolves.toEqual([
      {
        itemId: 'i1',
        authorId: 'a1',
        rating: 4,
        wouldOrderAgain: true,
        pricePaid: { value: 68, currency: 'ILS' as const },
        visibility: 'public',
        photoId: 'abcdefghijklmnopqrstuv',
        eatenAt: row.eatenAt,
        createdAt: row.createdAt,
      },
    ]);
  });

  it('counts an author’s entries at a venue through their items', async () => {
    const count = vi.fn().mockResolvedValue(3);
    await expect(repositoryWith({ count }).countByAuthorAtVenue('a1', 'v1')).resolves.toBe(3);
    expect(count).toHaveBeenCalledWith({ where: { authorId: 'a1', item: { venueId: 'v1' } } });
  });

  it('finds the items an author wrote about', async () => {
    const findMany = vi.fn().mockResolvedValue([{ itemId: 'i1' }, { itemId: 'i2' }]);
    await expect(repositoryWith({ findMany }).itemIdsWrittenBy('a1')).resolves.toEqual(
      new Set(['i1', 'i2']),
    );
  });
});
