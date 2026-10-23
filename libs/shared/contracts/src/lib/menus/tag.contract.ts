import { z } from 'zod';
import { LocalizedTextSchema } from '../common/values.contract';

/** REST base path: `/api/tags`. */
export const tagPath = 'tags';

/** Dish type ("hamburger"), diet ("vegan") or flavour ("spicy"). */
export const TagKindSchema = z.enum(['dish', 'diet', 'flavour']);

export type TagKind = z.infer<typeof TagKindSchema>;

/** A word in the Admin-curated vocabulary. Users never create tags. */
export const TagSchema = z.object({
  id: z.uuid(),
  slug: z
    .string()
    .regex(/^[a-z][a-z0-9-]{1,40}$/, 'Use lowercase English letters, digits and dashes.'),
  name: LocalizedTextSchema,
  kind: TagKindSchema,
});

export type Tag = z.infer<typeof TagSchema>;

/** `POST /api/tags` (Admin). */
export const CreateTagSchema = TagSchema.omit({ id: true });

export type CreateTag = z.infer<typeof CreateTagSchema>;

/** `PATCH /api/tags/:id` (Admin). The slug is the tag's identity and does not change. */
export const UpdateTagSchema = TagSchema.pick({ name: true, kind: true }).partial();

export type UpdateTag = z.infer<typeof UpdateTagSchema>;
