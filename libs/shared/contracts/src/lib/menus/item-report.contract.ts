import { z } from 'zod';
import { PriceSchema } from '../common/values.contract';

export function itemReportsPath(itemId: string): string {
  return `items/${itemId}/reports`;
}

export function venueItemReportsPath(venueId: string): string {
  return `venues/${venueId}/item-reports`;
}

export const venueItemReportsRoute = 'venues/:venueId/item-reports';

/** `gone`: no longer served. `price`: costs something else now, with the new price if the diner knows it. */
export const ItemReportKindSchema = z.enum(['gone', 'price']);

export type ItemReportKind = z.infer<typeof ItemReportKindSchema>;

export const CreateItemReportSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('gone') }),
  z.object({ kind: z.literal('price'), price: PriceSchema.nullable().default(null) }),
]);

export type CreateItemReport = z.infer<typeof CreateItemReportSchema>;
export type CreateItemReportInput = z.input<typeof CreateItemReportSchema>;

/** An item's open reports for its venue's Owner or an Admin, counted so no reporter is named. */
export const ItemReportSummarySchema = z.object({
  itemId: z.uuid(),
  goneCount: z.number().int().nonnegative(),
  priceCount: z.number().int().nonnegative(),
  /** The prices diners gave, newest first, each once. */
  reportedPrices: z.array(PriceSchema),
  /** The day of the newest report (UTC midnight), never its time. */
  lastReportedAt: z.iso.datetime(),
});

export type ItemReportSummary = z.infer<typeof ItemReportSummarySchema>;
