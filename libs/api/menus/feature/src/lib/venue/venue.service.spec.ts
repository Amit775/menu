import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { VenueRepository } from '@menu/api/menus/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { VenueService } from './venue.service';

describe('VenueService', () => {
  const venueId = '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10';
  const user: Principal = {
    accountId: 'u',
    isAdmin: false,
    isContributor: false,
    language: 'he',
    ownedVenueIds: [],
  };
  const owner: Principal = { ...user, ownedVenueIds: [venueId] };
  const admin: Principal = { ...user, isAdmin: true };
  const hidden = { id: venueId, status: 'hidden' };

  async function setup(
    repository: Partial<Record<keyof VenueRepository, unknown>>,
  ): Promise<VenueService> {
    const moduleRef = await Test.createTestingModule({
      providers: [VenueService, { provide: VenueRepository, useValue: repository }],
    }).compile();
    return moduleRef.get(VenueService);
  }

  it('shows visitors active venues only', async () => {
    const list = vi.fn().mockResolvedValue([]);
    await (await setup({ list })).list(null, { owned: false });
    expect(list).toHaveBeenCalledWith({ includeHidden: false });
  });

  it("lists an Owner's own venues, hidden ones included", async () => {
    const list = vi.fn().mockResolvedValue([]);
    await (await setup({ list })).list(owner, { owned: true });
    expect(list).toHaveBeenCalledWith({ ids: [venueId], includeHidden: true });
  });

  it("lists every venue as an Admin's own", async () => {
    const list = vi.fn().mockResolvedValue([]);
    await (await setup({ list })).list(admin, { owned: true });
    expect(list).toHaveBeenCalledWith({ includeHidden: true });
  });

  it('has no venues of its own for a visitor', async () => {
    const list = vi.fn();
    await expect((await setup({ list })).list(null, { owned: true })).resolves.toEqual([]);
    expect(list).not.toHaveBeenCalled();
  });

  it('hides a hidden venue from users but not from its Owner', async () => {
    const service = await setup({ findById: vi.fn().mockResolvedValue(hidden) });
    await expect(service.get(user, venueId)).rejects.toThrow(NotFoundException);
    await expect(service.get(owner, venueId)).resolves.toEqual(hidden);
  });

  it('records the Admin who created a venue', async () => {
    const create = vi.fn().mockResolvedValue({});
    const input = {
      name: { he: 'x', en: null },
      address: { he: 'y', en: null },
      location: { lat: 0, lng: 0 },
      phone: null,
      reservationUrl: null,
      sections: [],
    };
    await (await setup({ create })).create(admin, input);
    expect(create).toHaveBeenCalledWith(input, 'u');
  });

  it('fails with 404 when updating an unknown venue', async () => {
    const service = await setup({ update: vi.fn().mockResolvedValue(null) });
    await expect(service.update(venueId, { status: 'hidden' })).rejects.toThrow(NotFoundException);
  });
});
