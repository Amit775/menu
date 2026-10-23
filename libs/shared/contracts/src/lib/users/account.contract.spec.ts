import { AccountSchema, SetAdminSchema, UpdateAccountSchema } from './account.contract';

describe('Account contract', () => {
  const valid = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    displayName: 'נועה',
    language: 'he',
    isAdmin: false,
    ownedVenueIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('accepts a valid account', () => {
    expect(AccountSchema.parse(valid)).toEqual(valid);
  });

  it('allows an empty display name before the user picks one', () => {
    expect(AccountSchema.safeParse({ ...valid, displayName: '' }).success).toBe(true);
  });

  it('rejects an unknown language', () => {
    expect(AccountSchema.safeParse({ ...valid, language: 'fr' }).success).toBe(false);
  });

  it('does not let a user clear their name', () => {
    expect(UpdateAccountSchema.safeParse({ displayName: '  ' }).success).toBe(false);
    expect(UpdateAccountSchema.parse({ language: 'en' })).toEqual({ language: 'en' });
  });

  it('requires an explicit admin flag', () => {
    expect(SetAdminSchema.safeParse({}).success).toBe(false);
  });
});
