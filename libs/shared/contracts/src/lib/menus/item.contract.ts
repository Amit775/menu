import { z } from 'zod';
import { PriceSchema, LongTextSchema, TextSchema } from '../common/values.contract';

export const itemPath = 'items';

export function venueItemsPath(venueId: string): string {
  return `venues/${venueId}/items`;
}

export const venueItemsRoute = 'venues/:venueId/items';

/**
 * - `pending`: submitted by a user, visible only to them and the venue's approvers.
 * - `approved`: on the menu, searchable, open to entries.
 * - `rejected`: stays visible to its submitter only, with their entries kept as private notes.
 * - `merged`: pointed at an existing item (`mergedIntoId`); its entries moved there.
 * - `archived`: off the menu and out of search, entries kept.
 */
export const ItemStateSchema = z.enum(['pending', 'approved', 'rejected', 'merged', 'archived']);

export type ItemState = z.infer<typeof ItemStateSchema>;

const TagIdsSchema = z
  .array(z.uuid())
  .max(10)
  .refine((ids) => new Set(ids).size === ids.length, 'A tag can be applied once.');

/**
 * One dish or drink at one venue. `tagIds` are ordered: the first is the primary
 * tag that ranks the item against its peers. The submitter is never exposed;
 * `submittedByMe` tells the caller whether it is theirs.
 */
export const ItemSchema = z.object({
  id: z.uuid(),
  venueId: z.uuid(),
  sectionId: z.uuid(),
  name: TextSchema,
  description: LongTextSchema.nullable(),
  listPrice: PriceSchema.nullable(),
  tagIds: TagIdsSchema,
  state: ItemStateSchema,
  mergedIntoId: z.uuid().nullable(),
  submittedByMe: z.boolean(),
  position: z.number().int().min(0),
  createdAt: z.iso.datetime(),
});

export type Item = z.infer<typeof ItemSchema>;

/**
 * `POST /api/venues/:venueId/items`. From the venue's Owner or an Admin the item
 * is approved at once; from anyone else it is a pending submission.
 */
export const CreateItemSchema = z.object({
  sectionId: z.uuid(),
  name: TextSchema,
  description: LongTextSchema.nullable().default(null),
  listPrice: PriceSchema.nullable().default(null),
  tagIds: TagIdsSchema.default([]),
});

export type CreateItem = z.infer<typeof CreateItemSchema>;

export const UpdateItemSchema = z
  .object({
    sectionId: z.uuid(),
    name: TextSchema,
    description: LongTextSchema.nullable(),
    listPrice: PriceSchema.nullable(),
    tagIds: TagIdsSchema,
  })
  .partial();

export type UpdateItem = z.infer<typeof UpdateItemSchema>;

export const MergeItemSchema = z.object({ intoItemId: z.uuid() });

export type MergeItem = z.infer<typeof MergeItemSchema>;

export const ItemDecisionSchema = z.enum(['approve', 'reject', 'archive']);

export type ItemDecision = z.infer<typeof ItemDecisionSchema>;

export const MergeTagSchema = z.object({ intoTagId: z.uuid() });

export type MergeTag = z.infer<typeof MergeTagSchema>;

export const ItemRefSchema = z.object({
  id: z.uuid(),
  name: TextSchema,
  listPrice: PriceSchema.nullable(),
  venue: z.object({ id: z.uuid(), name: TextSchema }),
});

export type ItemRef = z.infer<typeof ItemRefSchema>;
