import { z } from 'zod';

export const contributorApplicationPath = 'contributor-applications';

export const myContributorApplicationPath = 'me/contributor-application';

export const ContributorApplicationStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export type ContributorApplicationStatus = z.infer<typeof ContributorApplicationStatusSchema>;

export const REAPPLY_AFTER_DAYS = 30;

const NoteSchema = z.string().trim().min(1).max(500);

/** An account's request to become a Contributor; who decided is never sent. */
export const ContributorApplicationSchema = z.object({
  id: z.uuid(),
  note: NoteSchema,
  status: ContributorApplicationStatusSchema,
  createdAt: z.iso.datetime(),
  decidedAt: z.iso.datetime().nullable(),
});

export type ContributorApplication = z.infer<typeof ContributorApplicationSchema>;

export const CreateContributorApplicationSchema = z.object({ note: NoteSchema });

export type CreateContributorApplication = z.infer<typeof CreateContributorApplicationSchema>;

/**
 * `GET /api/accounts/me/contributor-application`: the caller's latest application,
 * and from when they may apply (null while they cannot: pending, or already one).
 */
export const MyContributorApplicationSchema = z.object({
  application: ContributorApplicationSchema.nullable(),
  canApplyFrom: z.iso.datetime().nullable(),
});

export type MyContributorApplication = z.infer<typeof MyContributorApplicationSchema>;

/** What an Admin reviews: the application with the applicant's name. */
export const ContributorApplicationReviewSchema = ContributorApplicationSchema.extend({
  account: z.object({ id: z.uuid(), displayName: z.string() }),
});

export type ContributorApplicationReview = z.infer<typeof ContributorApplicationReviewSchema>;

export const ContributorApplicationDecisionSchema = z.enum(['approve', 'reject']);

export type ContributorApplicationDecision = z.infer<typeof ContributorApplicationDecisionSchema>;

export const SetContributorSchema = z.object({ isContributor: z.boolean() });

export type SetContributor = z.infer<typeof SetContributorSchema>;
