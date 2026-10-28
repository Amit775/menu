import { canContribute, canEditVenue, type Principal } from './principal';

describe('canEditVenue', () => {
  const venueId = '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10';
  const user: Principal = {
    accountId: 'a',
    isAdmin: false,
    isContributor: false,
    language: 'he',
    ownedVenueIds: [],
  };

  it('allows an Admin and the Owner of the venue', () => {
    expect(canEditVenue({ ...user, isAdmin: true }, venueId)).toBe(true);
    expect(canEditVenue({ ...user, ownedVenueIds: [venueId] }, venueId)).toBe(true);
  });

  it('refuses a visitor, a user and the Owner of another venue', () => {
    expect(canEditVenue(null, venueId)).toBe(false);
    expect(canEditVenue(user, venueId)).toBe(false);
    expect(canEditVenue({ ...user, ownedVenueIds: ['other'] }, venueId)).toBe(false);
  });
});

describe('canContribute', () => {
  const user: Principal = {
    accountId: 'a',
    isAdmin: false,
    isContributor: false,
    language: 'he',
    ownedVenueIds: ['v1'],
  };

  it('allows a Contributor and an Admin', () => {
    expect(canContribute({ ...user, isContributor: true })).toBe(true);
    expect(canContribute({ ...user, isAdmin: true })).toBe(true);
  });

  it('refuses a visitor, a user and an Owner', () => {
    expect(canContribute(null)).toBe(false);
    expect(canContribute(user)).toBe(false);
  });
});
