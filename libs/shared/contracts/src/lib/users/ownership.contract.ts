import { z } from 'zod';

export const ownershipPath = 'ownerships';

export const OwnershipSchema = z.object({
  accountId: z.uuid(),
  venueId: z.uuid(),
  displayName: z.string(),
  grantedAt: z.iso.datetime(),
});

export type Ownership = z.infer<typeof OwnershipSchema>;

export const GrantOwnershipSchema = OwnershipSchema.pick({ accountId: true, venueId: true });

export type GrantOwnership = z.infer<typeof GrantOwnershipSchema>;

export const OwnershipListQuerySchema = z.object({ venueId: z.uuid() });

export type OwnershipListQuery = z.infer<typeof OwnershipListQuerySchema>;
