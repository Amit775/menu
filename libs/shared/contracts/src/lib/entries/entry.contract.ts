import { z } from 'zod';
import { AgorotSchema } from '../common/values.contract';
import { ItemRefSchema } from '../menus/item.contract';
import { DisplayNameSchema } from '../users/account.contract';

/** REST base path: `/api/entries` (the caller's diary, one entry, Admin hide). */
export const entryPath = 'entries';

/** `/api/items/:itemId/entries`: the entries sheet of an item, and where entries are logged. */
export function itemEntriesPath(itemId: string): string {
  return `items/${itemId}/entries`;
}

/** Nest route for the same path. */
export const itemEntriesRoute = 'items/:itemId/entries';

/** `/api/shared/:token`: what a shared link shows, for anyone holding it. */
export function sharedEntryPath(token: string): string {
  return `shared/${token}`;
}

/** Nest route for the same path. */
export const sharedEntryRoute = 'shared/:token';

/**
 * - `private`: the author only. Still counts toward the item's score, anonymously.
 * - `shared`: anyone holding the link; not listed anywhere.
 * - `public`: everyone, with the author's display name.
 */
export const EntryVisibilitySchema = z.enum(['private', 'shared', 'public']);

export type EntryVisibility = z.infer<typeof EntryVisibilitySchema>;

export const RatingSchema = z.number().int().min(1).max(5);

/** The random, unguessable part of a share link (`/e/<token>`). */
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
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type Entry = z.infer<typeof EntrySchema>;

/** `POST /api/items/:itemId/entries`. Everything but the item is optional; `eatenAt` defaults to now. */
export const CreateEntrySchema = EntryFieldsSchema.extend({
  eatenAt: EatenAtSchema.optional(),
  rating: RatingSchema.nullable().default(null),
  wouldOrderAgain: z.boolean().nullable().default(null),
  pricePaid: AgorotSchema.nullable().default(null),
  text: z.string().trim().max(2000).default(''),
  visibility: EntryVisibilitySchema.default('private'),
});

export type CreateEntry = z.infer<typeof CreateEntrySchema>;

/** `PATCH /api/entries/:id` (author only). */
export const UpdateEntrySchema = EntryFieldsSchema.partial();

export type UpdateEntry = z.infer<typeof UpdateEntrySchema>;

/** Someone else's public entry, or a shared one opened by its link: never the author's id. */
export const PublicEntrySchema = EntryFieldsSchema.omit({ visibility: true }).extend({
  id: z.uuid(),
  itemId: z.uuid(),
  venueId: z.uuid(),
  eatenAt: z.iso.datetime({ offset: true }),
  authorName: z.union([DisplayNameSchema, z.literal('')]),
  createdAt: z.iso.datetime(),
});

export type PublicEntry = z.infer<typeof PublicEntrySchema>;

/** `GET /api/items/:itemId/entries`: the caller's own entries on top, then public ones, newest first. */
export const ItemEntriesSchema = z.object({
  mine: z.array(EntrySchema),
  others: z.array(PublicEntrySchema),
});

export type ItemEntries = z.infer<typeof ItemEntriesSchema>;

/** One line of the caller's diary: the entry and what it was about. */
export const EntryWithItemSchema = EntrySchema.extend({ item: ItemRefSchema });

export type EntryWithItem = z.infer<typeof EntryWithItemSchema>;

/** `GET /api/entries?venueId=&itemId=`: the caller's diary (`EntryWithItem[]`), newest first, optionally for one venue or item. */
export const DiaryQuerySchema = z.object({
  venueId: z.uuid().optional(),
  itemId: z.uuid().optional(),
});

export type DiaryQuery = z.infer<typeof DiaryQuerySchema>;

/** `PUT /api/entries/:id/hidden` (Admin). */
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
