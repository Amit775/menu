import { Test } from '@nestjs/testing';
import { OwnershipController } from './ownership.controller';
import { OwnershipService } from './ownership.service';

describe('OwnershipController', () => {
  async function setup(
    service: Partial<Record<keyof OwnershipService, unknown>>,
  ): Promise<OwnershipController> {
    const moduleRef = await Test.createTestingModule({
      controllers: [OwnershipController],
      providers: [{ provide: OwnershipService, useValue: service }],
    }).compile();
    return moduleRef.get(OwnershipController);
  }

  it('lists the Owners of the requested venue', async () => {
    const listByVenue = vi.fn().mockResolvedValue([]);
    await (await setup({ listByVenue })).list({ venueId: 'v1' });
    expect(listByVenue).toHaveBeenCalledWith('v1');
  });

  it('revokes by venue and account', async () => {
    const revoke = vi.fn().mockResolvedValue(undefined);
    await (await setup({ revoke })).revoke('v1', 'a1');
    expect(revoke).toHaveBeenCalledWith('a1', 'v1');
  });
});
