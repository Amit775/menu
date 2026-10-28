import { Injectable } from '@nestjs/common';
import { type DecimalColumn, PrismaService, readPrice, writePrice } from '@menu/api/shared/db';
import {
  type Currency,
  type ItemReportKind,
  type ItemReportSummary,
  type Price,
} from '@menu/shared/contracts';

export interface NewItemReport {
  itemId: string;
  reporterId: string;
  kind: ItemReportKind;
  price: Price | null;
}

interface ItemReportRow {
  itemId: string;
  kind: ItemReportKind;
  priceValue: DecimalColumn | null;
  priceCurrency: Currency | null;
  createdAt: Date;
}

@Injectable()
export class ItemReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** False when the item is not on the menu (any more). */
  async report(input: NewItemReport): Promise<boolean> {
    const { value, currency } = writePrice(input.price);
    const data = { kind: input.kind, priceValue: value, priceCurrency: currency };
    return this.prisma.$transaction(async (tx) => {
      // Share-locked so an archive or merge, which closes the item's reports, cannot commit between the check and the write.
      const onMenu = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "item" WHERE "id" = ${input.itemId}::uuid AND "state" = 'approved' FOR SHARE`;
      if (onMenu.length === 0) {
        return false;
      }
      await tx.itemReport.upsert({
        where: { itemId_reporterId: { itemId: input.itemId, reporterId: input.reporterId } },
        create: { itemId: input.itemId, reporterId: input.reporterId, ...data },
        update: { ...data, createdAt: new Date() },
      });
      return true;
    });
  }

  /** Newest reported first. */
  async summariesForVenue(venueId: string): Promise<ItemReportSummary[]> {
    const rows: ItemReportRow[] = await this.prisma.itemReport.findMany({
      where: { item: { venueId, state: 'approved' } },
      orderBy: { createdAt: 'desc' },
      select: { itemId: true, kind: true, priceValue: true, priceCurrency: true, createdAt: true },
    });
    const summaries = new Map<string, ItemReportSummary>();
    for (const row of rows) {
      const summary = summaries.get(row.itemId) ?? {
        itemId: row.itemId,
        goneCount: 0,
        priceCount: 0,
        reportedPrices: [],
        lastReportedAt: dayOf(row.createdAt),
      };
      summaries.set(row.itemId, summary);
      if (row.kind === 'gone') {
        summary.goneCount += 1;
        continue;
      }
      summary.priceCount += 1;
      const price = readPrice(row.priceValue, row.priceCurrency);
      if (price && !summary.reportedPrices.some((known) => priceKey(known) === priceKey(price))) {
        summary.reportedPrices.push(price);
      }
    }
    return [...summaries.values()];
  }
}

// Only the day: the exact time of a single report could be matched to a diner who was just there.
function dayOf(date: Date): string {
  return `${date.toISOString().slice(0, 10)}T00:00:00.000Z`;
}

function priceKey(price: Price): string {
  return `${price.currency} ${String(price.value)}`;
}
