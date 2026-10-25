import { z } from 'zod';
import { GeoPointSchema, TextSchema } from '../common/values.contract';

export const venuePath = 'venues';

export const VenueStatusSchema = z.enum(['active', 'hidden']);

export type VenueStatus = z.infer<typeof VenueStatusSchema>;

const PhoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 -]{6,20}$/);

/**
 * A restaurant or bar. Created and edited only by Admins; hiding it removes its
 * items from discovery but keeps every entry.
 */
export const VenueSchema = z.object({
  id: z.uuid(),
  name: TextSchema,
  address: TextSchema,
  location: GeoPointSchema,
  phone: PhoneSchema.nullable(),
  reservationUrl: z.url({ protocol: /^https?$/ }).nullable(),
  status: VenueStatusSchema,
  createdAt: z.iso.datetime(),
});

export type Venue = z.infer<typeof VenueSchema>;

export const CreateVenueSchema = VenueSchema.pick({
  name: true,
  address: true,
  location: true,
}).extend({
  phone: PhoneSchema.nullable().default(null),
  reservationUrl: VenueSchema.shape.reservationUrl.default(null),
  sections: z.array(TextSchema).max(30).default([]),
});

export type CreateVenue = z.infer<typeof CreateVenueSchema>;

export const UpdateVenueSchema = VenueSchema.pick({
  name: true,
  address: true,
  location: true,
  phone: true,
  reservationUrl: true,
  status: true,
}).partial();

export type UpdateVenue = z.infer<typeof UpdateVenueSchema>;

export const VenueListQuerySchema = z.object({
  owned: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type VenueListQuery = z.infer<typeof VenueListQuerySchema>;
