import { Test } from '@nestjs/testing';
import { EntryMergeListener, EntryService } from '@menu/api/entries/feature';
import { ItemService, MenusItemCatalog } from '@menu/api/menus/feature';
import { AUTHOR_DIRECTORY, ITEM_CATALOG, ITEM_MERGE_LISTENER } from '@menu/api/shared/util-ports';
import { AccountDirectory } from '@menu/api/users/feature';
import { AppModule } from './app.module';

describe('AppModule', () => {
  it('binds every cross-domain port to its implementation', async () => {
    const app = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(app.get(ITEM_MERGE_LISTENER, { strict: false })).toBeInstanceOf(EntryMergeListener);
    expect(app.get(ITEM_CATALOG, { strict: false })).toBeInstanceOf(MenusItemCatalog);
    expect(app.get(AUTHOR_DIRECTORY, { strict: false })).toBeInstanceOf(AccountDirectory);
    expect(app.get(ItemService, { strict: false })).toBeDefined();
    expect(app.get(EntryService, { strict: false })).toBeDefined();
    await app.close();
  });
});
