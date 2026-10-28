import { type EntryRepository, type SavedItemRepository } from '@menu/api/entries/data-access';
import { EntryStats } from './entry-stats';

describe('EntryStats', () => {
  it('summarizes facts per item', async () => {
    const listFacts = vi.fn().mockResolvedValue([
      {
        itemId: 'i1',
        authorId: 'a1',
        rating: 4,
        wouldOrderAgain: null,
        pricePaid: null,
        visibility: 'public',
        eatenAt: new Date('2026-10-10T00:00:00.000Z'),
        createdAt: new Date('2026-10-10T00:00:00.000Z'),
      },
    ]);
    const stats = await new EntryStats(
      { listFacts } as unknown as EntryRepository,
      {} as SavedItemRepository,
    ).statsByItem();
    expect(stats.get('i1')).toMatchObject({ ratingCount: 1, publicEntryCount: 1 });
  });

  it('lists the items someone saved, newest first', async () => {
    const itemIdsSavedBy = vi.fn().mockResolvedValue(['i2', 'i1']);
    const stats = new EntryStats(
      {} as EntryRepository,
      { itemIdsSavedBy } as unknown as SavedItemRepository,
    );
    await expect(stats.itemIdsSavedBy('a1')).resolves.toEqual(['i2', 'i1']);
  });
});
