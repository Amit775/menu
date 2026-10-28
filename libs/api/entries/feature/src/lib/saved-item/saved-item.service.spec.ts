import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SavedItemRepository } from '@menu/api/entries/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { ITEM_CATALOG } from '@menu/api/shared/util-ports';
import { SavedItemService } from './saved-item.service';

describe('SavedItemService', () => {
  const principal: Principal = {
    accountId: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    isAdmin: false,
    isContributor: false,
    language: 'he',
    ownedVenueIds: [],
  };
  const itemId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
  const target = { id: itemId, venueId: 'v1', isPublic: true, acceptsEntry: true, variations: [] };

  async function setup(
    repository: Partial<Record<keyof SavedItemRepository, unknown>>,
    findForEntries = vi.fn().mockResolvedValue(target),
  ): Promise<SavedItemService> {
    const moduleRef = await Test.createTestingModule({
      providers: [
        SavedItemService,
        { provide: SavedItemRepository, useValue: repository },
        { provide: ITEM_CATALOG, useValue: { findForEntries } },
      ],
    }).compile();
    return moduleRef.get(SavedItemService);
  }

  it('saves an item the caller could write about', async () => {
    const saved = { itemId, savedAt: '2026-10-28T10:00:00.000Z' };
    const save = vi.fn().mockResolvedValue(saved);
    await expect((await setup({ save })).save(principal, itemId)).resolves.toEqual(saved);
    expect(save).toHaveBeenCalledWith(principal.accountId, itemId);
  });

  it('fails with 404 for an unknown item, one taken off the menu or one still pending', async () => {
    const save = vi.fn();
    const unknown = await setup({ save }, vi.fn().mockResolvedValue(null));
    await expect(unknown.save(principal, itemId)).rejects.toThrow(NotFoundException);
    const archived = await setup(
      { save },
      vi.fn().mockResolvedValue({ ...target, acceptsEntry: false }),
    );
    await expect(archived.save(principal, itemId)).rejects.toThrow(NotFoundException);
    const ownPending = await setup(
      { save },
      vi.fn().mockResolvedValue({ ...target, isPublic: false }),
    );
    await expect(ownPending.save(principal, itemId)).rejects.toThrow(NotFoundException);
    expect(save).not.toHaveBeenCalled();
  });

  it('removes the caller’s saved item', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    await (await setup({ remove })).remove(principal, itemId);
    expect(remove).toHaveBeenCalledWith(principal.accountId, itemId);
  });
});
