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
    name: { he: 'פיצה' },
    listPrice: null,
    tagIds: [],
    state: 'approved',
    mergedIntoId: null,
    submittedById: null,
    position: 0,
    createdAt: '2026-10-23T10:00:00.000Z',
  };

  function catalog(record: ItemRecord | null, venueStatus = 'active'): MenusItemCatalog {
    const repository = { findById: vi.fn().mockResolvedValue(record) };
    const venues = { findById: vi.fn().mockResolvedValue({ id: venueId, status: venueStatus }) };
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
    });
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
});
