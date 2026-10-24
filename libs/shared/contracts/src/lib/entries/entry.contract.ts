import { z } from 'zod';
import { AgorotSchema } from '../common/values.contract';
import { ItemRefSchema } from '../menus/item.contract';
import { DisplayNameSchema } from '../users/account.contract';
import { PhotoUrlSchema } from './photo.contract';

export const entryPath = 'entries';

export function itemEntriesPath(itemId: string): string {
  return `items/${itemId}/entries`;
}

export const itemEntriesRoute = 'items/:itemId/entries';

export function sharedEntryPath(token: string): string {
  return `shared/${token}`;
}

export const sharedEntryRoute = 'shared/:token';

/**
 * - `private`: the author only. Still counts toward the item's score, anonymously.
 * - `shared`: anyone holding the link; not listed anywhere.
 * - `public`: everyone, with the author's display name.
 */
export const EntryVisibilitySchema = z.enum(['private', 'shared', 'public']);

export type EntryVisibility = z.infer<typeof EntryVisibilitySchema>;

export const RatingSchema = z.number().int().min(1).max(5);

export const ShareTokenSchema = z.string().regex(/^[\w-]{22}$/);

/** Allows a day of clock and time-zone skew; a diary line is never about tomorrow. */
const EatenAtSchema = z.iso
  .datetime({ offset: true })
  .refine((value) => Date.parse(value) <= Date.now() + 24 * 60 * 60 * 1000, 'Not in the future.');

const EntryFieldsSchema = z.object({
  eatenAt: EatenAtSchema,
  rating: RatingSchema.nullable(),
  wouldOrderAgain: z.boolean().nullable(),
  pricePaid: AgorotSchema.nullable(),
  text: z.string().trim().max(2000),
  visibility: EntryVisibilitySchema,
});

/**
 * An entry as its author sees it. `shareToken` exists once the entry has been
 * shared or public; `hidden` means an Admin took it off public view.
 */
export const EntrySchema = EntryFieldsSchema.extend({
  id: z.uuid(),
  itemId: z.uuid(),
  venueId: z.uuid(),
  eatenAt: z.iso.datetime({ offset: true }),
  shareToken: ShareTokenSchema.nullable(),
  hidden: z.boolean(),
  photoUrl: PhotoUrlSchema.nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Entry = z.infer<typeof EntrySchema>;

export const CreateEntrySchema = EntryFieldsSchema.extend({
  eatenAt: EatenAtSchema.optional(),
  rating: RatingSchema.nullable().default(null),
  wouldOrderAgain: z.boolean().nullable().default(null),
  pricePaid: AgorotSchema.nullable().default(null),
  text: z.string().trim().max(2000).default(''),
  visibility: EntryVisibilitySchema.default('private'),
});

export type CreateEntry = z.infer<typeof CreateEntrySchema>;
export type CreateEntryInput = z.input<typeof CreateEntrySchema>;

export const UpdateEntrySchema = EntryFieldsSchema.partial();

export type UpdateEntry = z.infer<typeof UpdateEntrySchema>;

export const PublicEntrySchema = EntryFieldsSchema.omit({ visibility: true }).extend({
  id: z.uuid(),
  itemId: z.uuid(),
  venueId: z.uuid(),
  eatenAt: z.iso.datetime({ offset: true }),
  authorName: z.union([DisplayNameSchema, z.literal('')]),
  photoUrl: PhotoUrlSchema.nullable(),
  createdAt: z.iso.datetime(),
});

export type PublicEntry = z.infer<typeof PublicEntrySchema>;

export const ItemEntriesSchema = z.object({
  item: ItemRefSchema,
  itemIsPublic: z.boolean(),
  mine: z.array(EntrySchema),
  others: z.array(PublicEntrySchema),
});

export type ItemEntries = z.infer<typeof ItemEntriesSchema>;

export const EntryWithItemSchema = EntrySchema.extend({ item: ItemRefSchema });

export type EntryWithItem = z.infer<typeof EntryWithItemSchema>;

export const DiaryQuerySchema = z.object({
  venueId: z.uuid().optional(),
  itemId: z.uuid().optional(),
});

export type DiaryQuery = z.infer<typeof DiaryQuerySchema>;

export const SetEntryHiddenSchema = z.object({ hidden: z.boolean() });

export type SetEntryHidden = z.infer<typeof SetEntryHiddenSchema>;

/**
 * `GET /api/shared/:token`. A link to an entry made private says so without
 * revealing anything; a deleted or hidden entry reads as removed.
 */
export const SharedEntryViewSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('visible'), entry: PublicEntrySchema, item: ItemRefSchema }),
  z.object({ status: z.literal('private') }),
  z.object({ status: z.literal('removed') }),
]);

export type SharedEntryView = z.infer<typeof SharedEntryViewSchema>;
