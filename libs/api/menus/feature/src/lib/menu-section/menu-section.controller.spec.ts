import { Test } from '@nestjs/testing';
import { type Principal } from '@menu/api/shared/util-auth';
import { MenuSectionController } from './menu-section.controller';
import { MenuSectionService } from './menu-section.service';

describe('MenuSectionController', () => {
  const principal: Principal = {
    accountId: 'u',
    isAdmin: true,
    isContributor: false,
    language: 'he',
    ownedVenueIds: [],
  };

  it('passes the caller and venue to the service', async () => {
    const reorder = vi.fn().mockResolvedValue([]);
    const moduleRef = await Test.createTestingModule({
      controllers: [MenuSectionController],
      providers: [{ provide: MenuSectionService, useValue: { reorder } }],
    }).compile();
    await moduleRef.get(MenuSectionController).reorder(principal, 'v1', { sectionIds: ['a'] });
    expect(reorder).toHaveBeenCalledWith(principal, 'v1', ['a']);
  });
});
