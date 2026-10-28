import { SavedItemSchema } from './saved-item.contract';

describe('SavedItemSchema', () => {
  it('accepts a saved item', () => {
    expect(
      SavedItemSchema.parse({
        itemId: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
        savedAt: '2026-10-28T10:00:00.000Z',
      }),
    ).toBeTruthy();
  });

  it('rejects an item id that is not one', () => {
    expect(
      SavedItemSchema.safeParse({ itemId: 'nope', savedAt: '2026-10-28T10:00:00.000Z' }).success,
    ).toBe(false);
  });
});
