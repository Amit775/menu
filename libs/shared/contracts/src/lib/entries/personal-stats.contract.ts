import { z } from 'zod';
import { PriceSchema, TextSchema } from '../common/values.contract';
import { ItemRefSchema } from '../menus/item.contract';
import { entryPath } from './entry.contract';

export const personalStatsRoute = 'me/stats';

export const personalStatsPath = `${entryPath}/${personalStatsRoute}`;

export const STATS_MONTHS = 6;

export const StatsMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export const PersonalStatsSchema = z.object({
  entryCount: z.number().int().nonnegative(),
  venueCount: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  averageRating: z.number().min(1).max(5).nullable(),
  /** The last `STATS_MONTHS` months in Israel time, oldest first; `spent` has one total per currency paid in. */
  months: z.array(
    z.object({
      month: StatsMonthSchema,
      entryCount: z.number().int().nonnegative(),
      spent: z.array(PriceSchema),
    }),
  ),
  topTags: z.array(z.object({ name: TextSchema, count: z.number().int().positive() })),
  mostOrdered: z.object({ item: ItemRefSchema, count: z.number().int().positive() }).nullable(),
});

export type PersonalStats = z.infer<typeof PersonalStatsSchema>;
