import { z } from 'zod';
import { GeoPointSchema, LocalizedTextSchema } from '../common/values.contract';

/** REST base path: `/api/venues`. Used by the Nest controller and the Angular client. */
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
  name: LocalizedTextSchema,
  address: z.string().trim().min(1).max(200),
  location: GeoPointSchema,
  phone: PhoneSchema.nullable(),
  reservationUrl: z.url({ protocol: /^https?$/ }).nullable(),
  status: VenueStatusSchema,
  createdAt: z.iso.datetime(),
});

export type Venue = z.infer<typeof VenueSchema>;

/** `POST /api/venues` (Admin). Optional first sections, in menu order. */
export const CreateVenueSchema = VenueSchema.pick({
  name: true,
  address: true,
  location: true,
}).extend({
  phone: PhoneSchema.nullable().default(null),
  reservationUrl: VenueSchema.shape.reservationUrl.default(null),
  sections: z.array(LocalizedTextSchema).max(30).default([]),
});

export type CreateVenue = z.infer<typeof CreateVenueSchema>;

/** `PATCH /api/venues/:id` (Admin). */
export const UpdateVenueSchema = VenueSchema.pick({
  name: true,
  address: true,
  location: true,
  phone: true,
  reservationUrl: true,
  status: true,
}).partial();

export type UpdateVenue = z.infer<typeof UpdateVenueSchema>;

/** `GET /api/venues?owned=true`: only the caller's venues (an Owner's "my venues"). */
export const VenueListQuerySchema = z.object({
  owned: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export type VenueListQuery = z.infer<typeof VenueListQuerySchema>;
