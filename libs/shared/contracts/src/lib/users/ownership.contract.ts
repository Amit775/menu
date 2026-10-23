import { z } from 'zod';

/** REST base path: `/api/ownerships`. */
export const ownershipPath = 'ownerships';

/** The grant that makes an account the Owner of one venue. Created and revoked by Admins. */
export const OwnershipSchema = z.object({
  accountId: z.uuid(),
  venueId: z.uuid(),
  displayName: z.string(),
  grantedAt: z.iso.datetime(),
});

export type Ownership = z.infer<typeof OwnershipSchema>;

/** `POST /api/ownerships` (Admin). */
export const GrantOwnershipSchema = OwnershipSchema.pick({ accountId: true, venueId: true });

export type GrantOwnership = z.infer<typeof GrantOwnershipSchema>;

/** `GET /api/ownerships?venueId=` (Admin): the Owners of one venue. */
export const OwnershipListQuerySchema = z.object({ venueId: z.uuid() });

export type OwnershipListQuery = z.infer<typeof OwnershipListQuerySchema>;
