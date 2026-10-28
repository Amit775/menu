import { ItemRefSchema, CreateItemSchema, ItemSchema, UpdateItemSchema } from './item.contract';

describe('Item contract', () => {
  const valid = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    venueId: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
    sectionId: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'המבורגר הקלאסי', en: 'Classic burger' },
    description: { he: 'קציצת בקר 220 גרם', en: null },
    listPrice: { value: 68, currency: 'ILS' },
    tagIds: ['3a2d3c4e-3333-4c1c-9a57-6f7a5d3c2b10'],
    variations: [
      {
        id: '5d2d3c4e-4444-4c1c-9a57-6f7a5d3c2b10',
        name: { he: 'טבעוני', en: 'Vegan' },
        price: { value: 62, currency: 'ILS' },
        tagIds: [],
        available: true,
      },
    ],
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
    expect(
      ItemSchema.safeParse({ ...valid, listPrice: { value: 68.555, currency: 'ILS' } }).success,
    ).toBe(false);
  });

  it('keeps descriptions to 2000 characters', () => {
    expect(
      ItemSchema.safeParse({ ...valid, description: { he: 'א'.repeat(2001), en: null } }).success,
    ).toBe(false);
  });

  it('rejects the same tag twice', () => {
    const tagId = valid.tagIds[0];
    expect(UpdateItemSchema.safeParse({ tagIds: [tagId, tagId] }).success).toBe(false);
  });

  it('defaults price and tags on create', () => {
    expect(
      CreateItemSchema.parse({ sectionId: valid.sectionId, name: { he: 'צ׳יפס', en: null } }),
    ).toEqual({
      sectionId: valid.sectionId,
      name: { he: 'צ׳יפס', en: null },
      description: null,
      listPrice: null,
      tagIds: [],
      variations: [],
    });
  });

  it('defaults a new variation to available, at the item price, untagged', () => {
    const { variations } = CreateItemSchema.parse({
      sectionId: valid.sectionId,
      name: { he: 'המבורגר', en: null },
      variations: [{ name: { he: 'עוף', en: null } }],
    });
    expect(variations).toEqual([
      { name: { he: 'עוף', en: null }, price: null, tagIds: [], available: true },
    ]);
  });

  it('rejects two variations with one id', () => {
    const [variation] = valid.variations;
    expect(UpdateItemSchema.safeParse({ variations: [variation, variation] }).success).toBe(false);
  });

  it('rejects two variations with one name', () => {
    expect(
      UpdateItemSchema.safeParse({
        variations: [{ name: { he: 'עוף', en: null } }, { name: { he: ' עוף ', en: 'Chicken' } }],
      }).success,
    ).toBe(false);
  });

  it('names an item with its venue and list price', () => {
    const ref = {
      id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
      name: { he: 'המבורגר', en: null },
      listPrice: { value: 68, currency: 'ILS' },
      venue: { id: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10', name: { he: 'מוזס', en: null } },
      variations: [
        {
          id: '5d2d3c4e-4444-4c1c-9a57-6f7a5d3c2b10',
          name: { he: 'טבעוני', en: null },
          price: null,
          available: false,
        },
      ],
    };
    expect(ItemRefSchema.parse(ref)).toEqual(ref);
    expect(ItemRefSchema.safeParse({ ...ref, venue: { id: 'x' } }).success).toBe(false);
    expect(ItemRefSchema.safeParse({ ...ref, listPrice: undefined }).success).toBe(false);
  });
});
