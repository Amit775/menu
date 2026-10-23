import { z } from 'zod';
import { LocalizedTextSchema } from '../common/values.contract';

/** `/api/venues/:venueId/sections`: a venue's menu headings, in menu order. */
export function menuSectionPath(venueId: string): string {
  return `venues/${venueId}/sections`;
}

/** Nest route for the same path. */
export const menuSectionRoute = 'venues/:venueId/sections';

/** A heading on the menu: starters, mains, drinks. Edited by the venue's Owner or an Admin. */
export const MenuSectionSchema = z.object({
  id: z.uuid(),
  venueId: z.uuid(),
  name: LocalizedTextSchema,
  position: z.number().int().min(0),
});

export type MenuSection = z.infer<typeof MenuSectionSchema>;

/** `POST /api/venues/:venueId/sections`: added at the end of the menu. */
export const CreateMenuSectionSchema = MenuSectionSchema.pick({ name: true });

export type CreateMenuSection = z.infer<typeof CreateMenuSectionSchema>;

/** `PATCH /api/venues/:venueId/sections/:id`. */
export const UpdateMenuSectionSchema = CreateMenuSectionSchema;

export type UpdateMenuSection = z.infer<typeof UpdateMenuSectionSchema>;

/** `PUT /api/venues/:venueId/sections/order`: every section id of the venue, in the new order. */
export const ReorderMenuSectionsSchema = z.object({
  sectionIds: z.array(z.uuid()).min(1),
});

export type ReorderMenuSections = z.infer<typeof ReorderMenuSectionsSchema>;
