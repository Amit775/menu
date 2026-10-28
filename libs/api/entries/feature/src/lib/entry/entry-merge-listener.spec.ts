import { type EntryRepository, type SavedItemRepository } from '@menu/api/entries/data-access';
import { EntryMergeListener } from './entry-merge-listener';

describe('EntryMergeListener', () => {
  it('moves entries and saved items to the item a duplicate was merged into', async () => {
    const moveEntries = vi.fn().mockResolvedValue(undefined);
    const moveSaved = vi.fn().mockResolvedValue(undefined);
    await new EntryMergeListener(
      { moveToItem: moveEntries } as unknown as EntryRepository,
      { moveToItem: moveSaved } as unknown as SavedItemRepository,
    ).onItemMerged('i1', 'i2');
    expect(moveEntries).toHaveBeenCalledWith('i1', 'i2');
    expect(moveSaved).toHaveBeenCalledWith('i1', 'i2');
  });
});
