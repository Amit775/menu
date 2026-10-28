import { Injectable } from '@nestjs/common';
import { PrismaService } from '@menu/api/shared/db';
import { type SavedItem } from '@menu/shared/contracts';

interface SavedItemRow {
  itemId: string;
  savedAt: Date;
}

@Injectable()
export class SavedItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Saving again keeps the first time it was saved. */
  async save(accountId: string, itemId: string): Promise<SavedItem> {
    const row = await this.prisma.savedItem.upsert({
      where: { accountId_itemId: { accountId, itemId } },
      create: { accountId, itemId },
      update: {},
    });
    return toContract(row);
  }

  async remove(accountId: string, itemId: string): Promise<void> {
    await this.prisma.savedItem.deleteMany({ where: { accountId, itemId } });
  }

  async isSaved(accountId: string, itemId: string): Promise<boolean> {
    return (await this.prisma.savedItem.count({ where: { accountId, itemId } })) > 0;
  }

  async itemIdsSavedBy(accountId: string): Promise<string[]> {
    const rows = await this.prisma.savedItem.findMany({
      where: { accountId },
      select: { itemId: true },
      orderBy: { savedAt: 'desc' },
    });
    return rows.map((row) => row.itemId);
  }

  /** Someone who saved both items keeps one; a save of the target meanwhile cannot collide. */
  async moveToItem(fromItemId: string, toItemId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.$executeRaw`
        INSERT INTO "saved_item" ("account_id", "item_id", "saved_at")
        SELECT "account_id", ${toItemId}::uuid, "saved_at" FROM "saved_item" WHERE "item_id" = ${fromItemId}::uuid
        ON CONFLICT DO NOTHING`,
      this.prisma.savedItem.deleteMany({ where: { itemId: fromItemId } }),
    ]);
  }
}

function toContract(row: SavedItemRow): SavedItem {
  return { itemId: row.itemId, savedAt: row.savedAt.toISOString() };
}
