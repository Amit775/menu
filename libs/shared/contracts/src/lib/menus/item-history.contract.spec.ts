import { ItemHistoryEventSchema, ItemSnapshotSchema } from './item-history.contract';

describe('ItemHistory contract', () => {
  const snapshot = {
    name: { he: 'המבורגר', en: 'Burger' },
    description: null,
    listPrice: { value: 58, currency: 'ILS' },
    sectionId: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    tagIds: [],
  };

  it('accepts a stored snapshot', () => {
    expect(ItemSnapshotSchema.parse(snapshot)).toEqual(snapshot);
  });

  it('rejects a snapshot without a section', () => {
    expect(ItemSnapshotSchema.safeParse({ ...snapshot, sectionId: undefined }).success).toBe(false);
  });

  it('accepts a price change', () => {
    const event = {
      kind: 'changed',
      at: '2026-10-28T10:00:00.000Z',
      changes: [
        {
          field: 'listPrice',
          from: { value: 58, currency: 'ILS' },
          to: { value: 64, currency: 'ILS' },
        },
      ],
    };
    expect(ItemHistoryEventSchema.parse(event)).toEqual(event);
  });

  it('rejects a change event that changes nothing', () => {
    expect(
      ItemHistoryEventSchema.safeParse({
        kind: 'changed',
        at: '2026-10-28T10:00:00.000Z',
        changes: [],
      }).success,
    ).toBe(false);
  });
});
