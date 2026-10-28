import { Test } from '@nestjs/testing';
import { type Principal } from '@menu/api/shared/util-auth';
import { SavedItemController } from './saved-item.controller';
import { SavedItemService } from './saved-item.service';

describe('SavedItemController', () => {
  const principal: Principal = {
    accountId: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    isAdmin: false,
    isContributor: false,
    language: 'he',
    ownedVenueIds: [],
  };
  const itemId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';

  it('saves and removes for the caller', async () => {
    const service = { save: vi.fn().mockResolvedValue({}), remove: vi.fn() };
    const moduleRef = await Test.createTestingModule({
      controllers: [SavedItemController],
      providers: [{ provide: SavedItemService, useValue: service }],
    }).compile();
    const controller = moduleRef.get(SavedItemController);
    await controller.save(principal, itemId);
    await controller.remove(principal, itemId);
    expect(service.save).toHaveBeenCalledWith(principal, itemId);
    expect(service.remove).toHaveBeenCalledWith(principal, itemId);
  });
});
