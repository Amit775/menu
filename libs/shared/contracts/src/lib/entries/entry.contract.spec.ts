import {
  CreateEntrySchema,
  DiaryQuerySchema,
  EntrySchema,
  EntryWithItemSchema,
  SharedEntryViewSchema,
  UpdateEntrySchema,
} from './entry.contract';

describe('Entry contract', () => {
  const valid = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    itemId: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
    venueId: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10',
    eatenAt: '2026-10-20T19:30:00.000Z',
    rating: 4,
    wouldOrderAgain: true,
    pricePaid: 6800,
    text: 'עסיסי, לחמנייה טובה',
    visibility: 'private',
    shareToken: null,
    hidden: false,
    createdAt: '2026-10-20T20:00:00.000Z',
    updatedAt: '2026-10-20T20:00:00.000Z',
  };

  it('accepts a valid entry', () => {
    expect(EntrySchema.parse(valid)).toEqual(valid);
  });

  it('rejects a rating outside 1 to 5', () => {
    expect(EntrySchema.safeParse({ ...valid, rating: 6 }).success).toBe(false);
  });

  it('fills in a bare entry: private, no rating, no text', () => {
    expect(CreateEntrySchema.parse({})).toEqual({
      rating: null,
      wouldOrderAgain: null,
      pricePaid: null,
      text: '',
      visibility: 'private',
    });
  });

  it('rejects an entry eaten next week', () => {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    expect(CreateEntrySchema.safeParse({ eatenAt: nextWeek }).success).toBe(false);
  });

  it('accepts a local time with an offset', () => {
    expect(UpdateEntrySchema.safeParse({ eatenAt: '2026-10-20T21:30:00+03:00' }).success).toBe(
      true,
    );
  });

  it('rejects text over 2000 characters', () => {
    expect(UpdateEntrySchema.safeParse({ text: 'א'.repeat(2001) }).success).toBe(false);
  });

  it('rejects a diary filter that is not an id', () => {
    expect(DiaryQuerySchema.safeParse({ venueId: 'x' }).success).toBe(false);
  });

  it('describes a link to an entry made private without its content', () => {
    expect(SharedEntryViewSchema.parse({ status: 'private' })).toEqual({ status: 'private' });
    expect(SharedEntryViewSchema.safeParse({ status: 'visible' }).success).toBe(false);
  });

  const item = {
    id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'המבורגר' },
    venue: { id: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10', name: { he: 'מוזס' } },
  };

  it('names the item and venue of a diary line', () => {
    expect(EntryWithItemSchema.parse({ ...valid, item }).item.venue.name.he).toBe('מוזס');
    expect(EntryWithItemSchema.safeParse(valid).success).toBe(false);
  });

  it('shows a visible shared entry with its item', () => {
    const entry = {
      id: valid.id,
      itemId: valid.itemId,
      venueId: valid.venueId,
      eatenAt: valid.eatenAt,
      rating: 4,
      wouldOrderAgain: true,
      pricePaid: 6800,
      text: '',
      authorName: 'דנה',
      createdAt: valid.createdAt,
    };
    expect(SharedEntryViewSchema.parse({ status: 'visible', entry, item }).status).toBe('visible');
    expect(SharedEntryViewSchema.safeParse({ status: 'visible', entry }).success).toBe(false);
  });
});
