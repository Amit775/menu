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
    const findOrCreateByFirebaseUid = vi.fn().mockResolvedValue(account);
    const service = await setup({ findOrCreateByFirebaseUid });
    await expect(service.resolve({ uid: 'uid-1', name: ' נועה ' })).resolves.toEqual({
      accountId: account.id,
      isAdmin: false,
      language: 'he',
      ownedVenueIds: [],
    });
    expect(findOrCreateByFirebaseUid).toHaveBeenCalledWith({
      firebaseUid: 'uid-1',
      displayName: 'נועה',
      isAdmin: false,
    });
  });

  it('makes a bootstrap uid an Admin', async () => {
    const findOrCreateByFirebaseUid = vi.fn().mockResolvedValue({ ...account, isAdmin: true });
    const service = await setup({ findOrCreateByFirebaseUid }, ['uid-1']);
    await expect(service.resolve({ uid: 'uid-1' })).resolves.toMatchObject({ isAdmin: true });
    expect(findOrCreateByFirebaseUid).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: '', isAdmin: true }),
    );
  });

  it('makes a bootstrap uid an Admin even when its account already exists', async () => {
    const findOrCreateByFirebaseUid = vi.fn().mockResolvedValue(account);
    const setAdmin = vi.fn().mockResolvedValue({ ...account, isAdmin: true });
    const service = await setup({ findOrCreateByFirebaseUid, setAdmin }, ['uid-1']);
    await expect(service.resolve({ uid: 'uid-1' })).resolves.toMatchObject({ isAdmin: true });
    expect(setAdmin).toHaveBeenCalledWith(account.id, true);
  });

  it('leaves an account that is not listed as it is', async () => {
    const setAdmin = vi.fn();
    const service = await setup(
      { findOrCreateByFirebaseUid: vi.fn().mockResolvedValue(account), setAdmin },
      ['someone-else'],
    );
    await expect(service.resolve({ uid: 'uid-1' })).resolves.toMatchObject({ isAdmin: false });
    expect(setAdmin).not.toHaveBeenCalled();
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

  it('fails with 404 when promoting an unknown account', async () => {
    const service = await setup({ setAdmin: vi.fn().mockResolvedValue(null) });
    await expect(service.setAdmin(admin, account.id, true)).rejects.toThrow(NotFoundException);
  });

  it('updates the caller', async () => {
    const service = await setup({
      update: vi.fn().mockResolvedValue({ ...account, language: 'en' }),
    });
    await expect(service.update(account.id, { language: 'en' })).resolves.toMatchObject({
      language: 'en',
    });
  });

  it('fails with 404 when updating an unknown account', async () => {
    const service = await setup({ update: vi.fn().mockResolvedValue(null) });
    await expect(service.update(account.id, { language: 'en' })).rejects.toThrow(NotFoundException);
  });

  it('lists accounts for an Admin', async () => {
    const list = vi.fn().mockResolvedValue([]);
    await expect((await setup({ list })).list()).resolves.toEqual([]);
  });

  it('stops an Admin from removing their own role', async () => {
    const service = await setup({ setAdmin: vi.fn() });
    await expect(service.setAdmin(admin, admin.accountId, false)).rejects.toThrow(
      BadRequestException,
    );
  });
});
