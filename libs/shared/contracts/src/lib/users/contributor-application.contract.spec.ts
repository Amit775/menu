import {
  ContributorApplicationReviewSchema,
  ContributorApplicationSchema,
  CreateContributorApplicationSchema,
  MyContributorApplicationSchema,
  SetContributorSchema,
} from './contributor-application.contract';

describe('ContributorApplication contract', () => {
  const valid = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    note: 'אוכלת בפלורנטין כל שבוע',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    decidedAt: null,
  };

  it('accepts a valid application', () => {
    expect(ContributorApplicationSchema.parse(valid)).toEqual(valid);
  });

  it('rejects an unknown status', () => {
    expect(ContributorApplicationSchema.safeParse({ ...valid, status: 'maybe' }).success).toBe(
      false,
    );
  });

  it('needs a note of up to 500 characters, trimmed', () => {
    expect(CreateContributorApplicationSchema.parse({ note: '  פלורנטין ' })).toEqual({
      note: 'פלורנטין',
    });
    expect(CreateContributorApplicationSchema.safeParse({ note: '   ' }).success).toBe(false);
    expect(CreateContributorApplicationSchema.safeParse({ note: 'א'.repeat(501) }).success).toBe(
      false,
    );
  });

  it('tells the caller about their application and when they may apply', () => {
    expect(
      MyContributorApplicationSchema.parse({ application: null, canApplyFrom: valid.createdAt }),
    ).toEqual({ application: null, canApplyFrom: valid.createdAt });
    expect(MyContributorApplicationSchema.safeParse({ application: null }).success).toBe(false);
  });

  it('shows an Admin the applicant, and requires an explicit contributor flag', () => {
    const review = { ...valid, account: { id: valid.id, displayName: 'נועה' } };
    expect(ContributorApplicationReviewSchema.parse(review)).toEqual(review);
    expect(SetContributorSchema.safeParse({}).success).toBe(false);
  });
});
