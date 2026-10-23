import { type EntryRepository } from '@menu/api/entries/data-access';
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
    const stats = await new EntryStats({ listFacts } as unknown as EntryRepository).statsByItem();
    expect(stats.get('i1')).toMatchObject({ ratingCount: 1, publicEntryCount: 1 });
  });
});
