import { z } from 'zod';
import { LanguageSchema } from '../common/values.contract';

/** REST base path: `/api/accounts`. Used by the Nest controller and the Angular client. */
export const accountPath = 'accounts';

/** `/api/accounts/me`: the signed-in account. */
export const accountMePath = 'me';

export const DisplayNameSchema = z.string().trim().min(1).max(60);

/**
 * The signed-in account as its owner sees it. `displayName` is empty until the
 * user picks one (phone sign-in has no name). `ownedVenueIds` makes the account
 * an Owner of those venues only.
 */
export const AccountSchema = z.object({
  id: z.uuid(),
  displayName: z.union([DisplayNameSchema, z.literal('')]),
  language: LanguageSchema,
  isAdmin: z.boolean(),
  ownedVenueIds: z.array(z.uuid()),
  createdAt: z.iso.datetime(),
});

export type Account = z.infer<typeof AccountSchema>;

/** `PATCH /api/accounts/me`: what a user may change about themselves. */
export const UpdateAccountSchema = z
  .object({
    displayName: DisplayNameSchema,
    language: LanguageSchema,
  })
  .partial();

export type UpdateAccount = z.infer<typeof UpdateAccountSchema>;

/** `GET /api/accounts` (Admin): one row per account, for assigning Owners and Admins. */
export const AccountSummarySchema = AccountSchema.pick({
  id: true,
  displayName: true,
  isAdmin: true,
  createdAt: true,
});

export type AccountSummary = z.infer<typeof AccountSummarySchema>;

/** `PUT /api/accounts/:id/admin` (Admin): make another account an Admin, or stop it being one. */
export const SetAdminSchema = z.object({ isAdmin: z.boolean() });

export type SetAdmin = z.infer<typeof SetAdminSchema>;
