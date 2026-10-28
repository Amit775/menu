import {
  type ItemRecord,
  type ItemRepository,
  type VenueRepository,
} from '@menu/api/menus/data-access';
import { type Principal } from '@menu/api/shared/util-auth';
import { MenusItemCatalog } from './item-catalog';

describe('MenusItemCatalog', () => {
  const venueId = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
  const submitter: Principal = {
    accountId: 'u',
    isAdmin: false,
    language: 'he',
    ownedVenueIds: [],
  };
  const owner: Principal = { ...submitter, accountId: 'w', ownedVenueIds: [venueId] };
  const base: ItemRecord = {
    id: 'i1',
    venueId,
    sectionId: 's1',
    name: { he: 'פיצה', en: null },
    description: null,
    listPrice: null,
    tagIds: [],
    variations: [],
    state: 'approved',
    mergedIntoId: null,
    submittedById: null,
    position: 0,
    createdAt: '2026-10-23T10:00:00.000Z',
  };

  function catalog(record: ItemRecord | null, venueStatus = 'active'): MenusItemCatalog {
    const repository = {
      findById: vi.fn().mockResolvedValue(record),
      findByIds: vi.fn().mockResolvedValue(record ? [record] : []),
    };
    const venue = { id: venueId, status: venueStatus, name: { he: 'מוזס', en: null } };
    const venues = {
      findById: vi.fn().mockResolvedValue(venue),
      list: vi.fn().mockResolvedValue([venue]),
    };
    return new MenusItemCatalog(
      repository as unknown as ItemRepository,
      venues as unknown as VenueRepository,
    );
  }

  it('opens an approved item to entries from any user', async () => {
    await expect(catalog(base).findForEntries(submitter, 'i1')).resolves.toEqual({
      id: 'i1',
      venueId,
      isPublic: true,
      acceptsEntry: true,
      variations: [],
    });
  });

  const seasonal = {
    id: '5d2d3c4e-4444-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'תות', en: 'Strawberry' },
    price: { value: 34, currency: 'ILS' as const },
    tagIds: ['3a2d3c4e-3333-4c1c-9a57-6f7a5d3c2b10'],
    available: false,
  };

  it('tells entries which variations an item has and which take entries', async () => {
    const target = await catalog({ ...base, variations: [seasonal] }).findForEntries(
      submitter,
      'i1',
    );
    expect(target?.variations).toEqual([{ id: seasonal.id, available: false }]);
  });

  it('names an item’s variations without their tags', async () => {
    const refs = await catalog({ ...base, variations: [seasonal] }).refsFor(['i1']);
    expect(refs.get('i1')?.variations).toEqual([
      { id: seasonal.id, name: seasonal.name, price: seasonal.price, available: false },
    ]);
  });

  it('lets visitors see an approved item without logging on it', async () => {
    await expect(catalog(base).findForEntries(null, 'i1')).resolves.toMatchObject({
      acceptsEntry: false,
    });
  });

  it('opens a pending item to its submitter only', async () => {
    const pending = { ...base, state: 'pending' as const, submittedById: 'u' };
    await expect(catalog(pending).findForEntries(submitter, 'i1')).resolves.toMatchObject({
      isPublic: false,
      acceptsEntry: true,
    });
    await expect(catalog(pending).findForEntries(owner, 'i1')).resolves.toMatchObject({
      acceptsEntry: false,
    });
    await expect(catalog(pending).findForEntries(null, 'i1')).resolves.toBeNull();
  });

  it('keeps a rejected item to its submitter, with no one else’s entries', async () => {
    const rejected = { ...base, state: 'rejected' as const, submittedById: 'u' };
    await expect(catalog(rejected).findForEntries(submitter, 'i1')).resolves.toMatchObject({
      isPublic: false,
      acceptsEntry: true,
    });
  });

  it('closes an archived item to new entries but keeps it public', async () => {
    const archived = { ...base, state: 'archived' as const };
    await expect(catalog(archived).findForEntries(submitter, 'i1')).resolves.toMatchObject({
      isPublic: true,
      acceptsEntry: false,
    });
  });

  it('hides the items of a hidden venue', async () => {
    await expect(catalog(base, 'hidden').findForEntries(submitter, 'i1')).resolves.toBeNull();
  });

  it('returns null for an unknown item', async () => {
    await expect(catalog(null).findForEntries(submitter, 'i1')).resolves.toBeNull();
  });

  it('names items with their venue, in any state', async () => {
    const pending = {
      ...base,
      state: 'pending' as const,
      listPrice: { value: 42, currency: 'ILS' as const },
    };
    const refs = await catalog(pending, 'hidden').refsFor(['i1', 'i1']);
    expect(refs.get('i1')).toEqual({
      id: 'i1',
      name: { he: 'פיצה', en: null },
      listPrice: { value: 42, currency: 'ILS' as const },
      venue: { id: venueId, name: { he: 'מוזס', en: null } },
      variations: [],
    });
  });

  it('leaves out unknown items', async () => {
    await expect(catalog(null).refsFor(['nope'])).resolves.toEqual(new Map());
  });
});
