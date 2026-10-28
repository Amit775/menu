import { type PrismaService } from '@menu/api/shared/db';
import { SavedItemRepository } from './saved-item.repository';

describe('SavedItemRepository', () => {
  const accountId = '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10';
  const itemId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';

  function repositoryWith(savedItem: Record<string, unknown>): SavedItemRepository {
    return new SavedItemRepository({ savedItem } as unknown as PrismaService);
  }

  it('saves an item once, keeping when it was first saved', async () => {
    const upsert = vi.fn().mockResolvedValue({
      accountId,
      itemId,
      savedAt: new Date('2026-10-28T10:00:00.000Z'),
    });
    await expect(repositoryWith({ upsert }).save(accountId, itemId)).resolves.toEqual({
      itemId,
      savedAt: '2026-10-28T10:00:00.000Z',
    });
    expect(upsert).toHaveBeenCalledWith({
      where: { accountId_itemId: { accountId, itemId } },
      create: { accountId, itemId },
      update: {},
    });
  });

  it('removes only the caller’s saved item', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    await repositoryWith({ deleteMany }).remove(accountId, itemId);
    expect(deleteMany).toHaveBeenCalledWith({ where: { accountId, itemId } });
  });

  it('tells whether the caller saved an item', async () => {
    const count = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    const repository = repositoryWith({ count });
    await expect(repository.isSaved(accountId, itemId)).resolves.toBe(true);
    await expect(repository.isSaved(accountId, itemId)).resolves.toBe(false);
    expect(count).toHaveBeenCalledWith({ where: { accountId, itemId } });
  });

  it('lists the caller’s saved items, newest first', async () => {
    const findMany = vi.fn().mockResolvedValue([{ itemId: 'b' }, { itemId: 'a' }]);
    await expect(repositoryWith({ findMany }).itemIdsSavedBy(accountId)).resolves.toEqual([
      'b',
      'a',
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { accountId },
      select: { itemId: true },
      orderBy: { savedAt: 'desc' },
    });
  });

  it('moves saved items to the merge target, dropping the duplicates', async () => {
    const $executeRaw = vi.fn().mockReturnValue('insert');
    const deleteMany = vi.fn().mockReturnValue('delete');
    const $transaction = vi.fn().mockResolvedValue([1, 1]);
    await new SavedItemRepository({
      $executeRaw,
      $transaction,
      savedItem: { deleteMany },
    } as unknown as PrismaService).moveToItem('from', 'to');
    expect($executeRaw.mock.calls[0]?.slice(1)).toEqual(['to', 'from']);
    expect(deleteMany).toHaveBeenCalledWith({ where: { itemId: 'from' } });
    expect($transaction).toHaveBeenCalledWith(['insert', 'delete']);
  });
});
