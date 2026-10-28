import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ContributorApplicationRepository } from '@menu/api/users/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { type ContributorApplication } from '@menu/shared/contracts';
import { canApplyFrom, ContributorApplicationService } from './contributor-application.service';

describe('ContributorApplicationService', () => {
  const now = new Date('2026-10-28T12:00:00.000Z');
  const user: Principal = {
    accountId: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    isAdmin: false,
    isContributor: false,
    language: 'he',
    ownedVenueIds: [],
  };
  const pending: ContributorApplication = {
    id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
    note: 'אני אוכלת בחוץ כל שבוע',
    status: 'pending',
    createdAt: '2026-10-20T12:00:00.000Z',
    decidedAt: null,
  };
  const rejectedOn = (decidedAt: string): ContributorApplication => ({
    ...pending,
    status: 'rejected',
    decidedAt,
  });

  async function setup(
    repository: Partial<Record<keyof ContributorApplicationRepository, unknown>>,
  ): Promise<ContributorApplicationService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        ContributorApplicationService,
        { provide: ContributorApplicationRepository, useValue: repository },
      ],
    }).compile();
    return moduleRef.get(ContributorApplicationService);
  }

  describe('canApplyFrom', () => {
    it('lets a user who never applied, or whose role was taken back, apply now', () => {
      expect(canApplyFrom(user, null, now)).toEqual(now);
      expect(canApplyFrom(user, { ...pending, status: 'approved' }, now)).toEqual(now);
    });

    it('waits 30 days after a rejection', () => {
      expect(canApplyFrom(user, rejectedOn('2026-10-20T12:00:00.000Z'), now)).toEqual(
        new Date('2026-11-19T12:00:00.000Z'),
      );
      expect(canApplyFrom(user, rejectedOn('2026-09-01T12:00:00.000Z'), now)).toEqual(now);
    });

    it('stops a pending applicant, a Contributor and an Admin', () => {
      expect(canApplyFrom(user, pending, now)).toBeNull();
      expect(canApplyFrom({ ...user, isContributor: true }, null, now)).toBeNull();
      expect(canApplyFrom({ ...user, isAdmin: true }, null, now)).toBeNull();
    });
  });

  it("shows the caller's latest application and when they may apply", async () => {
    const latestFor = vi.fn().mockResolvedValue(rejectedOn('2026-10-20T12:00:00.000Z'));
    const service = await setup({ latestFor });
    await expect(service.mine(user, now)).resolves.toEqual({
      application: rejectedOn('2026-10-20T12:00:00.000Z'),
      canApplyFrom: '2026-11-19T12:00:00.000Z',
    });
    expect(latestFor).toHaveBeenCalledWith(user.accountId);
  });

  it('files an application with the note', async () => {
    const create = vi.fn().mockResolvedValue(pending);
    const service = await setup({ latestFor: vi.fn().mockResolvedValue(null), create });
    await expect(service.apply(user, pending.note, now)).resolves.toEqual(pending);
    expect(create).toHaveBeenCalledWith(user.accountId, pending.note);
  });

  it('refuses to apply within 30 days of a rejection', async () => {
    const create = vi.fn();
    const service = await setup({
      latestFor: vi.fn().mockResolvedValue(rejectedOn('2026-10-20T12:00:00.000Z')),
      create,
    });
    await expect(service.apply(user, pending.note, now)).rejects.toThrow(ConflictException);
    expect(create).not.toHaveBeenCalled();
  });

  it('refuses a Contributor', async () => {
    const service = await setup({ latestFor: vi.fn().mockResolvedValue(null), create: vi.fn() });
    await expect(
      service.apply({ ...user, isContributor: true }, pending.note, now),
    ).rejects.toThrow(ConflictException);
  });

  it('refuses a second application filed at the same moment', async () => {
    const service = await setup({
      latestFor: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue(null),
    });
    await expect(service.apply(user, pending.note, now)).rejects.toThrow(ConflictException);
  });

  it('lists pending applications', async () => {
    const listPending = vi.fn().mockResolvedValue([]);
    await expect((await setup({ listPending })).listPending()).resolves.toEqual([]);
  });

  it('records which Admin decided', async () => {
    const review = {
      ...pending,
      status: 'approved',
      account: { id: user.accountId, displayName: '' },
    };
    const decide = vi.fn().mockResolvedValue(review);
    const admin = { ...user, accountId: 'admin-1', isAdmin: true };
    await expect((await setup({ decide })).decide(admin, pending.id, 'approve')).resolves.toEqual(
      review,
    );
    expect(decide).toHaveBeenCalledWith(pending.id, 'approve', 'admin-1');
  });

  it('fails with 404 for an application that is not pending', async () => {
    const service = await setup({ decide: vi.fn().mockResolvedValue(null) });
    await expect(service.decide(user, pending.id, 'reject')).rejects.toThrow(NotFoundException);
  });
});
