import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { OwnershipRepository } from '@menu/api/users/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { OwnershipService } from './ownership.service';

describe('OwnershipService', () => {
  const admin: Principal = { accountId: 'admin', isAdmin: true, language: 'he', ownedVenueIds: [] };
  const ids = {
    accountId: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    venueId: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  };

  async function setup(repository: Partial<Record<keyof OwnershipRepository, unknown>>): Promise<OwnershipService> {
    const moduleRef = await Test.createTestingModule({
      providers: [OwnershipService, { provide: OwnershipRepository, useValue: repository }],
    }).compile();
    return moduleRef.get(OwnershipService);
  }

  it('grants as the calling Admin', async () => {
    const grant = vi.fn().mockResolvedValue({ ...ids, displayName: '', grantedAt: '' });
    await (await setup({ grant })).grant(admin, ids);
    expect(grant).toHaveBeenCalledWith(ids, 'admin');
  });

  it('fails with 404 for an unknown account or venue', async () => {
    const service = await setup({ grant: vi.fn().mockResolvedValue(null) });
    await expect(service.grant(admin, ids)).rejects.toThrow(NotFoundException);
  });

  it('fails with 404 when revoking a grant that does not exist', async () => {
    const service = await setup({ revoke: vi.fn().mockResolvedValue(false) });
    await expect(service.revoke(ids.accountId, ids.venueId)).rejects.toThrow(NotFoundException);
  });

  it('revokes an existing grant', async () => {
    const service = await setup({ revoke: vi.fn().mockResolvedValue(true) });
    await expect(service.revoke(ids.accountId, ids.venueId)).resolves.toBeUndefined();
  });
});
