import { z } from 'zod';
import { AgorotSchema, LocalizedTextSchema } from '../common/values.contract';

/** REST base path: `/api/items`. */
export const itemPath = 'items';

/** `/api/venues/:venueId/items`: a venue's menu items, and where missing items are submitted. */
export function venueItemsPath(venueId: string): string {
  return `venues/${venueId}/items`;
}

/** Nest route for the same path. */
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
  name: LocalizedTextSchema,
  listPrice: AgorotSchema.nullable(),
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
  name: LocalizedTextSchema,
  listPrice: AgorotSchema.nullable().default(null),
  tagIds: TagIdsSchema.default([]),
});

export type CreateItem = z.infer<typeof CreateItemSchema>;

/** `PATCH /api/items/:id` (Owner or Admin). */
export const UpdateItemSchema = z
  .object({
    sectionId: z.uuid(),
    name: LocalizedTextSchema,
    listPrice: AgorotSchema.nullable(),
    tagIds: TagIdsSchema,
  })
  .partial();

export type UpdateItem = z.infer<typeof UpdateItemSchema>;

/** `POST /api/items/:id/merge` (Owner or Admin): the pending item duplicates `intoItemId`. */
export const MergeItemSchema = z.object({ intoItemId: z.uuid() });

export type MergeItem = z.infer<typeof MergeItemSchema>;

/** `POST /api/items/:id/<decision>` for a pending or approved item. */
export const ItemDecisionSchema = z.enum(['approve', 'reject', 'archive']);

export type ItemDecision = z.infer<typeof ItemDecisionSchema>;

/** `POST /api/tags/:id/merge` (Admin): re-point every item from this tag to `intoTagId`, then delete it. */
export const MergeTagSchema = z.object({ intoTagId: z.uuid() });

export type MergeTag = z.infer<typeof MergeTagSchema>;

/** An item named with its venue, for lists that show it away from its menu (a diary, a shared link). */
export const ItemRefSchema = z.object({
  id: z.uuid(),
  name: LocalizedTextSchema,
  venue: z.object({ id: z.uuid(), name: LocalizedTextSchema }),
});

export type ItemRef = z.infer<typeof ItemRefSchema>;
