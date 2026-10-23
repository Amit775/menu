import { Test } from '@nestjs/testing';
import { type Principal } from '@menu/api/shared/util-auth';
import { EntryController, ItemEntriesController, SharedEntryController } from './entry.controller';
import { EntryService } from './entry.service';

describe('Entry controllers', () => {
  const principal: Principal = {
    accountId: 'a1',
    isAdmin: false,
    language: 'he',
    ownedVenueIds: [],
  };

  async function setup(service: Partial<Record<keyof EntryService, unknown>>) {
    const moduleRef = await Test.createTestingModule({
      controllers: [EntryController, ItemEntriesController, SharedEntryController],
      providers: [{ provide: EntryService, useValue: service }],
    }).compile();
    return {
      entries: moduleRef.get(EntryController),
      itemEntries: moduleRef.get(ItemEntriesController),
      shared: moduleRef.get(SharedEntryController),
    };
  }

  it('logs an entry on an item for the caller', async () => {
    const create = vi.fn().mockResolvedValue({});
    const input = {
      rating: null,
      wouldOrderAgain: null,
      pricePaid: null,
      text: '',
      visibility: 'private' as const,
    };
    await (await setup({ create })).itemEntries.create(principal, 'i1', input);
    expect(create).toHaveBeenCalledWith(principal, 'i1', input);
  });

  it('passes the diary filter', async () => {
    const diary = vi.fn().mockResolvedValue([]);
    await (await setup({ diary })).entries.diary(principal, { venueId: 'v1' });
    expect(diary).toHaveBeenCalledWith(principal, { venueId: 'v1' });
  });

  it('hides an entry by id', async () => {
    const setHidden = vi.fn().mockResolvedValue(undefined);
    await (await setup({ setHidden })).entries.setHidden('e1', { hidden: true });
    expect(setHidden).toHaveBeenCalledWith('e1', true);
  });

  it('opens a share link', async () => {
    const shared = vi.fn().mockResolvedValue({ status: 'removed' });
    await (await setup({ shared })).shared.get('abcdefghijklmnopqrstuv');
    expect(shared).toHaveBeenCalledWith('abcdefghijklmnopqrstuv');
  });
});
