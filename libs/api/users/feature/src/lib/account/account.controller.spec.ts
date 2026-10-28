import { Test } from '@nestjs/testing';
import { type Principal } from '@menu/api/shared/util-auth';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

describe('AccountController', () => {
  const principal: Principal = {
    accountId: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    isAdmin: false,
    isContributor: false,
    language: 'he',
    ownedVenueIds: [],
  };

  async function setup(
    service: Partial<Record<keyof AccountService, unknown>>,
  ): Promise<AccountController> {
    const moduleRef = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [{ provide: AccountService, useValue: service }],
    }).compile();
    return moduleRef.get(AccountController);
  }

  it('returns the caller as /me', async () => {
    const get = vi.fn().mockResolvedValue({ id: principal.accountId });
    await (await setup({ get })).me(principal);
    expect(get).toHaveBeenCalledWith(principal.accountId);
  });

  it('updates only the caller', async () => {
    const update = vi.fn().mockResolvedValue({});
    await (await setup({ update })).updateMe(principal, { language: 'en' });
    expect(update).toHaveBeenCalledWith(principal.accountId, { language: 'en' });
  });

  it('lists accounts', async () => {
    const list = vi.fn().mockResolvedValue([]);
    await expect((await setup({ list })).list()).resolves.toEqual([]);
  });

  it('passes the caller to setAdmin', async () => {
    const setAdmin = vi.fn().mockResolvedValue({});
    const id = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
    await (await setup({ setAdmin })).setAdmin(principal, id, { isAdmin: true });
    expect(setAdmin).toHaveBeenCalledWith(principal, id, true);
  });

  it('sets the Contributor role through the service', async () => {
    const setContributor = vi.fn().mockResolvedValue({});
    const id = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
    await (await setup({ setContributor })).setContributor(id, { isContributor: false });
    expect(setContributor).toHaveBeenCalledWith(id, false);
  });
});
