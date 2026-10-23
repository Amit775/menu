import { Test } from '@nestjs/testing';
import { VenueController } from './venue.controller';
import { VenueService } from './venue.service';

describe('VenueController', () => {
  async function setup(
    service: Partial<Record<keyof VenueService, unknown>>,
  ): Promise<VenueController> {
    const moduleRef = await Test.createTestingModule({
      controllers: [VenueController],
      providers: [{ provide: VenueService, useValue: service }],
    }).compile();
    return moduleRef.get(VenueController);
  }

  it('lists for the caller, signed in or not', async () => {
    const list = vi.fn().mockResolvedValue([]);
    await (await setup({ list })).list(null, { owned: false });
    expect(list).toHaveBeenCalledWith(null, { owned: false });
  });

  it('updates through the service', async () => {
    const update = vi.fn().mockResolvedValue({});
    await (await setup({ update })).update('v1', { status: 'hidden' });
    expect(update).toHaveBeenCalledWith('v1', { status: 'hidden' });
  });
});
