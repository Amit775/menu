import { type PrismaService } from '@menu/api/shared/db';
import { EntryRepository } from './entry.repository';

describe('EntryRepository', () => {
  const row = {
    id: 'e1',
    authorId: 'a1',
    itemId: 'i1',
    venueId: 'v1',
    eatenAt: new Date('2026-10-20T19:30:00.000Z'),
    rating: 4,
    wouldOrderAgain: true,
    pricePaid: 6800,
    text: 'טעים',
    visibility: 'private',
    shareToken: null,
    hiddenAt: null,
    photoId: null,
    photoType: null,
    createdAt: new Date('2026-10-20T20:00:00.000Z'),
    updatedAt: new Date('2026-10-20T20:00:00.000Z'),
  };

  function repositoryWith(entry: Record<string, unknown>): EntryRepository {
    const $transaction = (operations: Promise<unknown>[]) => Promise.all(operations);
    return new EntryRepository({ entry, $transaction } as unknown as PrismaService);
  }

  it('maps a row to a record, with the hidden flag', async () => {
    const findUnique = vi.fn().mockResolvedValue({ ...row, hiddenAt: new Date() });
    await expect(repositoryWith({ findUnique }).findById('e1')).resolves.toMatchObject({
      id: 'e1',
      authorId: 'a1',
      eatenAt: '2026-10-20T19:30:00.000Z',
      hidden: true,
      photoUrl: null,
    });
  });

  it('lists a diary for one venue, newest first', async () => {
    const findMany = vi.fn().mockResolvedValue([row]);
    await repositoryWith({ findMany }).listByAuthor('a1', { venueId: 'v1' });
    expect(findMany).toHaveBeenCalledWith({
      where: { authorId: 'a1', venueId: 'v1' },
      orderBy: [{ eatenAt: 'desc' }, { createdAt: 'desc' }],
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

  it('deletes only the author’s own entry', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 1 });
    await expect(repositoryWith({ deleteMany }).delete('e1', 'a1')).resolves.toBe(true);
    expect(deleteMany).toHaveBeenCalledWith({ where: { id: 'e1', authorId: 'a1' } });
  });

  it('never hides a private entry', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    await repositoryWith({ updateMany }).setHidden('e1', true, 'newPhotoIdnewPhotoId00');
    expect(updateMany.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'e1', visibility: { not: 'private' } },
    });
  });

  it('gives a hidden entry’s photo a new id, and leaves it on un-hide', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const repository = repositoryWith({ updateMany });
    await repository.setHidden('e1', true, 'newPhotoIdnewPhotoId00');
    expect(updateMany.mock.calls[1]?.[0]).toEqual({
      where: { id: 'e1', visibility: { not: 'private' }, photoId: { not: null } },
      data: { photoId: 'newPhotoIdnewPhotoId00' },
    });
    updateMany.mockClear();
    await repository.setHidden('e1', false, 'otherPhotoIdotherPhot0');
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it('maps a photo to its URL', async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValue({ ...row, photoId: 'abcdefghijklmnopqrstuv', photoType: 'image/png' });
    await expect(
      repositoryWith({ findUnique }).findByPhotoId('abcdefghijklmnopqrstuv'),
    ).resolves.toMatchObject({
      photoUrl: '/api/photos/abcdefghijklmnopqrstuv',
      photoType: 'image/png',
    });
    expect(findUnique).toHaveBeenCalledWith({ where: { photoId: 'abcdefghijklmnopqrstuv' } });
  });

  it('sets and clears a photo on the author’s own entry only', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 0 });
    const repository = repositoryWith({ updateMany });
    const photo = { photoId: 'abcdefghijklmnopqrstuv', photoType: 'image/jpeg' as const };
    await expect(repository.setPhoto('e1', 'a2', photo)).resolves.toBeNull();
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 'e1', authorId: 'a2' }, data: photo });
    await repository.setPhoto('e1', 'a2', null);
    expect(updateMany).toHaveBeenLastCalledWith({
      where: { id: 'e1', authorId: 'a2' },
      data: { photoId: null, photoType: null },
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

  it('finds the items an author wrote about', async () => {
    const findMany = vi.fn().mockResolvedValue([{ itemId: 'i1' }, { itemId: 'i2' }]);
    await expect(repositoryWith({ findMany }).itemIdsWrittenBy('a1')).resolves.toEqual(
      new Set(['i1', 'i2']),
    );
  });
});
