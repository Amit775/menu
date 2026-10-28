import { type PrismaService } from '@menu/api/shared/db';
import { ItemReportRepository } from './item-report.repository';

describe('ItemReportRepository', () => {
  const venueId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';

  function report(overrides: Record<string, unknown>) {
    return {
      itemId: 'i1',
      kind: 'gone',
      priceValue: null,
      priceCurrency: null,
      createdAt: new Date('2026-10-20T10:00:00.000Z'),
      ...overrides,
    };
  }

  function reporting(onMenu: { id: string }[]) {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue(onMenu),
      itemReport: { upsert: vi.fn().mockResolvedValue({}) },
    };
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    return {
      upsert: tx.itemReport.upsert,
      repository: new ItemReportRepository(prisma as unknown as PrismaService),
    };
  }

  it('files nothing on an item that left the menu', async () => {
    const { upsert, repository } = reporting([]);
    await expect(
      repository.report({ itemId: 'i1', reporterId: 'a1', kind: 'gone', price: null }),
    ).resolves.toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('keeps one open report per diner and item, the latest one', async () => {
    const { upsert, repository } = reporting([{ id: 'i1' }]);
    await repository.report({
      itemId: 'i1',
      reporterId: 'a1',
      kind: 'price',
      price: { value: 74, currency: 'ILS' },
    });
    const data = { kind: 'price', priceValue: 74, priceCurrency: 'ILS' };
    expect(upsert).toHaveBeenCalledWith({
      where: { itemId_reporterId: { itemId: 'i1', reporterId: 'a1' } },
      create: { itemId: 'i1', reporterId: 'a1', ...data },
      update: { ...data, createdAt: expect.any(Date) as Date },
    });
  });

  it('sums up the open reports on a venue’s menu per item, to the day, naming no one', async () => {
    const findMany = vi.fn().mockResolvedValue([
      report({
        kind: 'price',
        priceValue: { toNumber: () => 74 },
        priceCurrency: 'ILS',
        createdAt: new Date('2026-10-22T10:17:31.250Z'),
      }),
      report({ kind: 'price', priceValue: { toNumber: () => 74 }, priceCurrency: 'ILS' }),
      report({ kind: 'price' }),
      report({ createdAt: new Date('2026-10-21T10:00:00.000Z') }),
      report({ itemId: 'i2', createdAt: new Date('2026-10-19T10:00:00.000Z') }),
    ]);
    const repository = new ItemReportRepository({
      itemReport: { findMany },
    } as unknown as PrismaService);
    await expect(repository.summariesForVenue(venueId)).resolves.toEqual([
      {
        itemId: 'i1',
        goneCount: 1,
        priceCount: 3,
        reportedPrices: [{ value: 74, currency: 'ILS' }],
        lastReportedAt: '2026-10-22T00:00:00.000Z',
      },
      {
        itemId: 'i2',
        goneCount: 1,
        priceCount: 0,
        reportedPrices: [],
        lastReportedAt: '2026-10-19T00:00:00.000Z',
      },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: { item: { venueId, state: 'approved' } },
      orderBy: { createdAt: 'desc' },
      select: {
        itemId: true,
        kind: true,
        priceValue: true,
        priceCurrency: true,
        createdAt: true,
      },
    });
  });
});
