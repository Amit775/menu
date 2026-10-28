import { type PrismaService } from '@menu/api/shared/db';
import { ContributorApplicationRepository } from './contributor-application.repository';

describe('ContributorApplicationRepository', () => {
  const accountId = '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10';
  const row = {
    id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
    accountId,
    note: 'אני אוכלת בחוץ כל שבוע',
    status: 'pending' as const,
    decidedById: null,
    decidedAt: null,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
  };
  const application = {
    id: row.id,
    note: row.note,
    status: 'pending',
    createdAt: '2026-10-01T00:00:00.000Z',
    decidedAt: null,
  };
  const account = { id: accountId, displayName: 'נועה' };

  function withTransaction(tx: Record<string, unknown>): ContributorApplicationRepository {
    const prisma = { $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) };
    return new ContributorApplicationRepository(prisma as unknown as PrismaService);
  }

  it("reads the account's latest application", async () => {
    const findFirst = vi.fn().mockResolvedValue(row);
    const repository = new ContributorApplicationRepository({
      contributorApplication: { findFirst },
    } as unknown as PrismaService);
    await expect(repository.latestFor(accountId)).resolves.toEqual(application);
    expect(findFirst).toHaveBeenCalledWith({
      where: { accountId },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('creates an application with the locked applicant having none pending', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: accountId }]),
      contributorApplication: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue(row),
      },
    };
    await expect(withTransaction(tx).create(accountId, row.note)).resolves.toEqual(application);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.contributorApplication.create).toHaveBeenCalledWith({
      data: { accountId, note: row.note },
    });
  });

  it('refuses a second pending application', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: accountId }]),
      contributorApplication: { count: vi.fn().mockResolvedValue(1), create: vi.fn() },
    };
    await expect(withTransaction(tx).create(accountId, row.note)).resolves.toBeNull();
    expect(tx.contributorApplication.create).not.toHaveBeenCalled();
  });

  it('lists pending applications with the applicant, oldest first', async () => {
    const findMany = vi.fn().mockResolvedValue([{ ...row, account }]);
    const repository = new ContributorApplicationRepository({
      contributorApplication: { findMany },
    } as unknown as PrismaService);
    await expect(repository.listPending()).resolves.toEqual([{ ...application, account }]);
    expect(findMany).toHaveBeenCalledWith({
      where: { status: 'pending' },
      include: { account: { select: { id: true, displayName: true } } },
      orderBy: { createdAt: 'asc' },
    });
  });

  it('approves a pending application and makes the applicant a Contributor', async () => {
    const decidedAt = new Date('2026-10-02T00:00:00.000Z');
    const tx = {
      contributorApplication: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi
          .fn()
          .mockResolvedValue({ ...row, status: 'approved', decidedAt, account }),
      },
      account: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    };
    await expect(withTransaction(tx).decide(row.id, 'approve', 'admin-1')).resolves.toEqual({
      ...application,
      status: 'approved',
      decidedAt: '2026-10-02T00:00:00.000Z',
      account,
    });
    expect(tx.contributorApplication.updateMany).toHaveBeenCalledWith({
      where: { id: row.id, status: 'pending' },
      data: { status: 'approved', decidedById: 'admin-1', decidedAt: expect.any(Date) as unknown },
    });
    expect(tx.account.updateMany).toHaveBeenCalledWith({
      where: { id: accountId, role: 'user' },
      data: { role: 'contributor' },
    });
  });

  it('rejects without changing the role', async () => {
    const tx = {
      contributorApplication: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue({
          ...row,
          status: 'rejected',
          decidedAt: new Date('2026-10-02T00:00:00.000Z'),
          account,
        }),
      },
      account: { updateMany: vi.fn() },
    };
    await expect(withTransaction(tx).decide(row.id, 'reject', 'admin-1')).resolves.toMatchObject({
      status: 'rejected',
    });
    expect(tx.account.updateMany).not.toHaveBeenCalled();
  });

  it('decides nothing on an application that is no longer pending', async () => {
    const tx = {
      contributorApplication: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        findUniqueOrThrow: vi.fn(),
      },
      account: { updateMany: vi.fn() },
    };
    await expect(withTransaction(tx).decide(row.id, 'approve', 'admin-1')).resolves.toBeNull();
    expect(tx.account.updateMany).not.toHaveBeenCalled();
  });
});
