import { CreateItemReportSchema, ItemReportSummarySchema } from './item-report.contract';

describe('CreateItemReportSchema', () => {
  it('accepts a report that the item is gone', () => {
    expect(CreateItemReportSchema.parse({ kind: 'gone' })).toEqual({ kind: 'gone' });
  });

  it('accepts a price change with no price given', () => {
    expect(CreateItemReportSchema.parse({ kind: 'price' })).toEqual({ kind: 'price', price: null });
  });

  it('rejects an unknown kind and a price that is not one', () => {
    expect(CreateItemReportSchema.safeParse({ kind: 'closed' }).success).toBe(false);
    expect(
      CreateItemReportSchema.safeParse({ kind: 'price', price: { value: -1, currency: 'ILS' } })
        .success,
    ).toBe(false);
  });
});

describe('ItemReportSummarySchema', () => {
  const summary = {
    itemId: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    goneCount: 2,
    priceCount: 1,
    reportedPrices: [{ value: 74, currency: 'ILS' }],
    lastReportedAt: '2026-10-28T10:00:00.000Z',
  };

  it('accepts a summary', () => {
    expect(ItemReportSummarySchema.parse(summary)).toEqual(summary);
  });

  it('rejects a negative count', () => {
    expect(ItemReportSummarySchema.safeParse({ ...summary, goneCount: -1 }).success).toBe(false);
  });
});
