import { z } from 'zod';

export const savedItemPath = 'saved-items';

export const SavedItemSchema = z.object({
  itemId: z.uuid(),
  savedAt: z.iso.datetime(),
});

export type SavedItem = z.infer<typeof SavedItemSchema>;
