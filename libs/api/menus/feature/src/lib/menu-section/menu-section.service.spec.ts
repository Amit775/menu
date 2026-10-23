import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MenuSectionRepository, VenueRepository } from '@menu/api/menus/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { MenuSectionService } from './menu-section.service';

describe('MenuSectionService', () => {
  const venueId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
  const user: Principal = { accountId: 'u', isAdmin: false, language: 'he', ownedVenueIds: [] };
  const owner: Principal = { ...user, ownedVenueIds: [venueId] };
  const venue = { id: venueId, status: 'active' };

  async function setup(
    repository: Partial<Record<keyof MenuSectionRepository, unknown>>,
    found: unknown = venue,
  ): Promise<MenuSectionService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        MenuSectionService,
        { provide: MenuSectionRepository, useValue: repository },
        { provide: VenueRepository, useValue: { findById: vi.fn().mockResolvedValue(found) } },
      ],
    }).compile();
    return moduleRef.get(MenuSectionService);
  }

  it('lets the Owner add a section', async () => {
    const create = vi.fn().mockResolvedValue({});
    await (await setup({ create })).create(owner, venueId, { he: 'קינוחים' });
    expect(create).toHaveBeenCalledWith(venueId, { he: 'קינוחים' });
  });

  it('forbids a user who does not own the venue', async () => {
    const service = await setup({ create: vi.fn() });
    await expect(service.create(user, venueId, { he: 'x' })).rejects.toThrow(ForbiddenException);
  });

  it('fails with 404 for a missing venue', async () => {
    const service = await setup({ create: vi.fn() }, null);
    await expect(service.create(owner, venueId, { he: 'x' })).rejects.toThrow(NotFoundException);
  });

  it('hides the sections of a hidden venue from users', async () => {
    const service = await setup({ listByVenue: vi.fn() }, { ...venue, status: 'hidden' });
    await expect(service.list(user, venueId)).rejects.toThrow(NotFoundException);
  });

  it('reorders when every section is listed once', async () => {
    const reorder = vi.fn().mockResolvedValue([]);
    const listByVenue = vi.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    await (await setup({ listByVenue, reorder })).reorder(owner, venueId, ['b', 'a']);
    expect(reorder).toHaveBeenCalledWith(venueId, ['b', 'a']);
  });

  it.each([[['a']], [['a', 'a']], [['a', 'c']]])('rejects the order %j', async (ids) => {
    const listByVenue = vi.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const service = await setup({ listByVenue, reorder: vi.fn() });
    await expect(service.reorder(owner, venueId, ids)).rejects.toThrow(BadRequestException);
  });
});
