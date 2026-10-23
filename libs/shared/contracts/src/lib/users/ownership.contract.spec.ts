import { GrantOwnershipSchema, OwnershipListQuerySchema, OwnershipSchema } from './ownership.contract';

describe('Ownership contract', () => {
  const valid = {
    accountId: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    venueId: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
    displayName: 'יוסי',
    grantedAt: '2026-01-01T00:00:00.000Z',
  };

  it('accepts a valid ownership', () => {
    expect(OwnershipSchema.parse(valid)).toEqual(valid);
  });

  it('grants with an account and a venue', () => {
    expect(GrantOwnershipSchema.safeParse({ accountId: valid.accountId }).success).toBe(false);
  });

  it('lists by venue', () => {
    expect(OwnershipListQuerySchema.safeParse({ venueId: 'nope' }).success).toBe(false);
  });
});
