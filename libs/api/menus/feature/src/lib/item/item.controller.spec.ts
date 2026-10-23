import { Test } from '@nestjs/testing';
import { type Principal } from '@menu/api/shared/util-auth';
import { ItemController, VenueItemController } from './item.controller';
import { ItemService } from './item.service';

describe('ItemController', () => {
  const principal: Principal = { accountId: 'u', isAdmin: true, language: 'he', ownedVenueIds: [] };

  async function setup(service: Partial<Record<keyof ItemService, unknown>>) {
    const moduleRef = await Test.createTestingModule({
      controllers: [ItemController, VenueItemController],
      providers: [{ provide: ItemService, useValue: service }],
    }).compile();
    return { items: moduleRef.get(ItemController), venueItems: moduleRef.get(VenueItemController) };
  }

  it('passes a decision to the service', async () => {
    const decide = vi.fn().mockResolvedValue({});
    await (await setup({ decide })).items.decide(principal, 'i1', 'approve');
    expect(decide).toHaveBeenCalledWith(principal, 'i1', 'approve');
  });

  it('passes the merge target to the service', async () => {
    const merge = vi.fn().mockResolvedValue({});
    await (await setup({ merge })).items.merge(principal, 'i1', { intoItemId: 'i2' });
    expect(merge).toHaveBeenCalledWith(principal, 'i1', 'i2');
  });

  it('submits an item to a venue', async () => {
    const create = vi.fn().mockResolvedValue({});
    const input = { sectionId: 's', name: { he: 'x' }, listPrice: null, tagIds: [] };
    await (await setup({ create })).venueItems.create(principal, 'v1', input);
    expect(create).toHaveBeenCalledWith(principal, 'v1', input);
  });
});
