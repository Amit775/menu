import { Test } from '@nestjs/testing';
import { type Principal } from '@menu/api/shared/util-auth';
import {
  ContributorApplicationController,
  MyContributorApplicationController,
} from './contributor-application.controller';
import { ContributorApplicationService } from './contributor-application.service';

describe('contributor application controllers', () => {
  const principal: Principal = {
    accountId: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    isAdmin: false,
    isContributor: false,
    language: 'he',
    ownedVenueIds: [],
  };
  const id = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';

  async function setup(service: Partial<Record<keyof ContributorApplicationService, unknown>>) {
    const moduleRef = await Test.createTestingModule({
      controllers: [MyContributorApplicationController, ContributorApplicationController],
      providers: [{ provide: ContributorApplicationService, useValue: service }],
    }).compile();
    return {
      mine: moduleRef.get(MyContributorApplicationController),
      admin: moduleRef.get(ContributorApplicationController),
    };
  }

  it("reads and files the caller's own application", async () => {
    const mine = vi.fn().mockResolvedValue({ application: null, canApplyFrom: null });
    const apply = vi.fn().mockResolvedValue({});
    const controllers = await setup({ mine, apply });
    await controllers.mine.mine(principal);
    await controllers.mine.apply(principal, { note: 'הערה' });
    expect(mine).toHaveBeenCalledWith(principal);
    expect(apply).toHaveBeenCalledWith(principal, 'הערה');
  });

  it('lists and decides applications for an Admin', async () => {
    const listPending = vi.fn().mockResolvedValue([]);
    const decide = vi.fn().mockResolvedValue({});
    const controllers = await setup({ listPending, decide });
    await expect(controllers.admin.listPending()).resolves.toEqual([]);
    await controllers.admin.decide(principal, id, 'reject');
    expect(decide).toHaveBeenCalledWith(principal, id, 'reject');
  });
});
