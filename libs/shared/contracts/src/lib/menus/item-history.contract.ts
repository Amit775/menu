import { z } from 'zod';
import { LongTextSchema, PriceSchema, TextSchema } from '../common/values.contract';

export const ItemRevisionKindSchema = z.enum([
  'created',
  'submitted',
  'updated',
  'approved',
  'rejected',
  'merged',
  'archived',
]);

export type ItemRevisionKind = z.infer<typeof ItemRevisionKindSchema>;

/** The item's catalog fields as one revision stored them (`item_revision.snapshot`). */
export const ItemSnapshotSchema = z.object({
  name: TextSchema,
  description: LongTextSchema.nullable(),
  listPrice: PriceSchema.nullable(),
  sectionId: z.uuid(),
  tagIds: z.array(z.uuid()),
});

export type ItemSnapshot = z.infer<typeof ItemSnapshotSchema>;

export const ItemChangeSchema = z.discriminatedUnion('field', [
  z.object({ field: z.literal('name'), from: TextSchema, to: TextSchema }),
  z.object({ field: z.literal('description') }),
  z.object({
    field: z.literal('listPrice'),
    from: PriceSchema.nullable(),
    to: PriceSchema.nullable(),
  }),
  z.object({ field: z.literal('section'), from: TextSchema.nullable(), to: TextSchema.nullable() }),
  z.object({
    field: z.literal('tags'),
    added: z.array(TextSchema),
    removed: z.array(TextSchema),
  }),
]);

export type ItemChange = z.infer<typeof ItemChangeSchema>;

/**
 * One line of an item's public history. It starts when the item reached the menu;
 * who made a change is never shown.
 */
export const ItemHistoryEventSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('added'), at: z.iso.datetime(), listPrice: PriceSchema.nullable() }),
  z.object({
    kind: z.literal('changed'),
    at: z.iso.datetime(),
    changes: z.array(ItemChangeSchema).min(1),
  }),
  z.object({ kind: z.literal('archived'), at: z.iso.datetime() }),
]);

export type ItemHistoryEvent = z.infer<typeof ItemHistoryEventSchema>;
