import { z } from 'zod';
import { LocalizedTextSchema } from '../common/values.contract';

export function menuSectionPath(venueId: string): string {
  return `venues/${venueId}/sections`;
}

export const menuSectionRoute = 'venues/:venueId/sections';

export const MenuSectionSchema = z.object({
  id: z.uuid(),
  venueId: z.uuid(),
  name: LocalizedTextSchema,
  position: z.number().int().min(0),
});

export type MenuSection = z.infer<typeof MenuSectionSchema>;

export const CreateMenuSectionSchema = MenuSectionSchema.pick({ name: true });

export type CreateMenuSection = z.infer<typeof CreateMenuSectionSchema>;

export const UpdateMenuSectionSchema = CreateMenuSectionSchema;

export type UpdateMenuSection = z.infer<typeof UpdateMenuSectionSchema>;

export const ReorderMenuSectionsSchema = z.object({
  sectionIds: z.array(z.uuid()).min(1),
});

export type ReorderMenuSections = z.infer<typeof ReorderMenuSectionsSchema>;
