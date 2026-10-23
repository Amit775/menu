import { Global, Module } from '@nestjs/common';
import { EntryMergeListener, EntryModule } from '@menu/api/entries/feature';
import { ItemModule, MenusItemCatalog } from '@menu/api/menus/feature';
import { AUTHOR_DIRECTORY, ITEM_CATALOG, ITEM_MERGE_LISTENER } from '@menu/api/shared/util-ports';
import { AccountDirectory, AccountModule } from '@menu/api/users/feature';

/**
 * Binds the cross-domain ports (ADR 0004) to the domain that implements each.
 * Global, so a domain module injects a port without importing another domain.
 */
@Global()
@Module({
  imports: [AccountModule, ItemModule, EntryModule],
  providers: [
    { provide: AUTHOR_DIRECTORY, useExisting: AccountDirectory },
    { provide: ITEM_CATALOG, useExisting: MenusItemCatalog },
    { provide: ITEM_MERGE_LISTENER, useExisting: EntryMergeListener },
  ],
  exports: [AUTHOR_DIRECTORY, ITEM_CATALOG, ITEM_MERGE_LISTENER],
})
export class PortsModule {}
