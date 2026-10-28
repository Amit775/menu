import { DiscoverItemSchema, FeedQuerySchema, SearchQuerySchema } from './discover.contract';

describe('Discover contract', () => {
  it('reads a feed query from strings with defaults', () => {
    expect(
      FeedQuerySchema.parse({
        lat: '32.08',
        lng: '34.78',
        tagIds: '3a2d3c4e-3333-4c1c-9a57-6f7a5d3c2b10',
      }),
    ).toEqual({
      lat: 32.08,
      lng: 34.78,
      radiusKm: 5,
      tagIds: ['3a2d3c4e-3333-4c1c-9a57-6f7a5d3c2b10'],
      mode: 'reels',
      sort: 'score',
      offset: 0,
      limit: 20,
    });
  });

  it('rejects a latitude without a longitude', () => {
    expect(FeedQuerySchema.safeParse({ lat: '32.08' }).success).toBe(false);
  });

  it('rejects a tag filter that is not an id', () => {
    expect(FeedQuerySchema.safeParse({ tagIds: 'burger' }).success).toBe(false);
  });

  it('rejects an empty search', () => {
    expect(SearchQuerySchema.safeParse({ q: '  ' }).success).toBe(false);
  });

  it('accepts an item without a score yet', () => {
    const item = {
      id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
      name: { he: 'המבורגר', en: null },
      venue: {
        id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
        name: { he: 'הבורגר של משה', en: null },
      },
      sectionId: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10',
      tagIds: [],
      distanceMeters: 420,
      score: null,
      ratingCount: 1,
      wouldOrderAgainPercent: null,
      latestPrice: { value: 68, currency: 'ILS' },
      photoUrl: null,
      writtenByMe: true,
      savedByMe: false,
    };
    expect(DiscoverItemSchema.parse(item)).toEqual(item);
  });
});
