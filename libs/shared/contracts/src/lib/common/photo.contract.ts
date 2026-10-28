import { z } from 'zod';

/** 22 random URL-safe characters, changed whenever the photo or its audience changes. */
export const PhotoIdSchema = z.string().regex(/^[\w-]{22}$/);

/** The image types an upload may have, told apart by the file's first bytes. */
export const PhotoTypeSchema = z.enum(['image/jpeg', 'image/png', 'image/webp']);

export type PhotoType = z.infer<typeof PhotoTypeSchema>;

export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;
