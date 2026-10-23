import { ItemRefSchema, CreateItemSchema, ItemSchema, UpdateItemSchema } from './item.contract';

describe('Item contract', () => {
  const valid = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    venueId: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
    sectionId: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'המבורגר הקלאסי', en: 'Classic burger' },
    listPrice: 6800,
    tagIds: ['3a2d3c4e-3333-4c1c-9a57-6f7a5d3c2b10'],
    state: 'approved',
    mergedIntoId: null,
    submittedByMe: false,
    position: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  it('accepts a valid item', () => {
    expect(ItemSchema.parse(valid)).toEqual(valid);
  });

  it('rejects a price in fractions of an agora', () => {
    expect(ItemSchema.safeParse({ ...valid, listPrice: 68.5 }).success).toBe(false);
  });

  it('rejects the same tag twice', () => {
    const tagId = valid.tagIds[0];
    expect(UpdateItemSchema.safeParse({ tagIds: [tagId, tagId] }).success).toBe(false);
  });

  it('defaults price and tags on create', () => {
    expect(CreateItemSchema.parse({ sectionId: valid.sectionId, name: { he: 'צ׳יפס' } })).toEqual({
      sectionId: valid.sectionId,
      name: { he: 'צ׳יפס' },
      listPrice: null,
      tagIds: [],
    });
  });

  it('names an item with its venue and list price', () => {
    const ref = {
      id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
      name: { he: 'המבורגר' },
      listPrice: 6800,
      venue: { id: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10', name: { he: 'מוזס' } },
    };
    expect(ItemRefSchema.parse(ref)).toEqual(ref);
    expect(ItemRefSchema.safeParse({ ...ref, venue: { id: 'x' } }).success).toBe(false);
    expect(ItemRefSchema.safeParse({ ...ref, listPrice: undefined }).success).toBe(false);
  });
});
