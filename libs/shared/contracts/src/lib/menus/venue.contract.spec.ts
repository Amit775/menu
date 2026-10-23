import {
  CreateVenueSchema,
  UpdateVenueSchema,
  VenueListQuerySchema,
  VenueSchema,
} from './venue.contract';

describe('Venue contract', () => {
  const valid = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'בורגר 24', en: 'Burger 24' },
    address: 'אבן גבירול 112, תל אביב',
    location: { lat: 32.08, lng: 34.78 },
    phone: '03-1234567',
    reservationUrl: 'https://example.com/book',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('accepts a valid venue', () => {
    expect(VenueSchema.parse(valid)).toEqual(valid);
  });

  it('rejects a reservation link that is not http(s)', () => {
    expect(VenueSchema.safeParse({ ...valid, reservationUrl: 'javascript:alert(1)' }).success).toBe(
      false,
    );
  });

  it('defaults optional fields on create', () => {
    expect(
      CreateVenueSchema.parse({
        name: valid.name,
        address: valid.address,
        location: valid.location,
      }),
    ).toEqual({
      name: valid.name,
      address: valid.address,
      location: valid.location,
      phone: null,
      reservationUrl: null,
      sections: [],
    });
  });

  it('lets an Admin hide a venue', () => {
    expect(UpdateVenueSchema.parse({ status: 'hidden' })).toEqual({ status: 'hidden' });
    expect(UpdateVenueSchema.safeParse({ status: 'deleted' }).success).toBe(false);
  });

  it('reads the owned filter from the query string', () => {
    expect(VenueListQuerySchema.parse({ owned: 'true' })).toEqual({ owned: true });
    expect(VenueListQuerySchema.parse({})).toEqual({ owned: false });
  });
});
