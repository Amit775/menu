import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AccountRepository } from '@menu/api/users/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { AccountService } from './account.service';
import { USERS_CONFIG } from './users.config';

describe('AccountService', () => {
  const account = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    displayName: 'נועה',
    language: 'he' as const,
    isAdmin: false,
    ownedVenueIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const admin: Principal = {
    accountId: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
    isAdmin: true,
    language: 'he',
    ownedVenueIds: [],
  };

  async function setup(
    repository: Partial<Record<keyof AccountRepository, unknown>>,
    bootstrapAdminUids: string[] = [],
  ): Promise<AccountService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountService,
        { provide: AccountRepository, useValue: repository },
        { provide: USERS_CONFIG, useValue: { bootstrapAdminUids } },
      ],
    }).compile();
    return moduleRef.get(AccountService);
  }

  it('resolves a first sign-in into a principal, taking the name from the provider', async () => {
    const upsertByFirebaseUid = vi.fn().mockResolvedValue(account);
    const service = await setup({ upsertByFirebaseUid });
    await expect(service.resolve({ uid: 'uid-1', name: ' נועה ' })).resolves.toEqual({
      accountId: account.id,
      isAdmin: false,
      language: 'he',
      ownedVenueIds: [],
    });
    expect(upsertByFirebaseUid).toHaveBeenCalledWith({
      firebaseUid: 'uid-1',
      displayName: 'נועה',
      isAdmin: false,
    });
  });

  it('makes a bootstrap uid an Admin', async () => {
    const upsertByFirebaseUid = vi.fn().mockResolvedValue({ ...account, isAdmin: true });
    const service = await setup({ upsertByFirebaseUid }, ['uid-1']);
    await expect(service.resolve({ uid: 'uid-1' })).resolves.toMatchObject({ isAdmin: true });
    expect(upsertByFirebaseUid).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: '', isAdmin: true }),
    );
  });

  it('fails with 404 for an unknown account', async () => {
    const service = await setup({ findById: vi.fn().mockResolvedValue(null) });
    await expect(service.get(account.id)).rejects.toThrow(NotFoundException);
  });

  it('lets an Admin promote another account', async () => {
    const summary = {
      id: account.id,
      displayName: 'נועה',
      isAdmin: true,
      createdAt: account.createdAt,
    };
    const service = await setup({ setAdmin: vi.fn().mockResolvedValue(summary) });
    await expect(service.setAdmin(admin, account.id, true)).resolves.toEqual(summary);
  });

  it('stops an Admin from removing their own role', async () => {
    const service = await setup({ setAdmin: vi.fn() });
    await expect(service.setAdmin(admin, admin.accountId, false)).rejects.toThrow(
      BadRequestException,
    );
  });
});
