import { type EntryRepository } from '@menu/api/entries/data-access';
import { EntryMergeListener } from './entry-merge-listener';

describe('EntryMergeListener', () => {
  it('moves entries to the item a duplicate was merged into', async () => {
    const moveToItem = vi.fn().mockResolvedValue(undefined);
    await new EntryMergeListener({ moveToItem } as unknown as EntryRepository).onItemMerged(
      'i1',
      'i2',
    );
    expect(moveToItem).toHaveBeenCalledWith('i1', 'i2');
  });
});
