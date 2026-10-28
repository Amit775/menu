import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Roles } from '@menu/web/shared/util-auth';
import { MenuApiClient } from '../menu/menu.api-client';
import { item, venue, VENUE_ID, settle } from '../testing/fixtures';
import { ManagedVenuesStore } from './managed-venues.store';

describe('ManagedVenuesStore', () => {
  const other = {
    ...venue,
    id: '1c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'אבו חסן', en: null },
  };

  function setup(api: Partial<MenuApiClient>, isAdmin = false) {
    TestBed.configureTestingModule({
      providers: [ManagedVenuesStore, { provide: MenuApiClient, useValue: api }],
    });
    TestBed.inject(Roles).set({
      isAdmin,
      isContributor: false,
      ownedVenueIds: isAdmin ? [] : [VENUE_ID],
    });
    return TestBed.inject(ManagedVenuesStore);
  }

  it('lists an Owner’s venues with how many items wait at each', async () => {
    const venues = vi.fn().mockResolvedValue([venue]);
    const store = setup({ venues, pending: vi.fn().mockResolvedValue([item, item]) });
    await settle();
    expect(venues).toHaveBeenCalledWith(true);
    expect(store.status()).toBe('loaded');
    expect(store.rows()).toEqual([{ venue, pending: 2 }]);
  });

  it('lists every venue for an Admin, those with waiting items first', async () => {
    const venues = vi.fn().mockResolvedValue([other, venue]);
    const store = setup({ venues, pending: vi.fn().mockResolvedValue([item]) }, true);
    await settle();
    expect(venues).toHaveBeenCalledWith(false);
    expect(store.rows().map((row) => row.venue.id)).toEqual([VENUE_ID, other.id]);
    expect(store.pendingTotal()).toBe(1);
  });

  it('records a failed load', async () => {
    const store = setup({
      venues: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 500 })),
      pending: vi.fn().mockResolvedValue([]),
    });
    await settle();
    expect(store.status()).toBe('error');
  });

  it('adds a new venue to the list', async () => {
    const createVenue = vi.fn().mockResolvedValue(other);
    const store = setup(
      {
        venues: vi.fn().mockResolvedValue([venue]),
        pending: vi.fn().mockResolvedValue([]),
        createVenue,
      },
      true,
    );
    await settle();
    const input = { name: other.name, address: other.address, location: other.location };
    await expect(store.create(input)).resolves.toEqual(other);
    expect(createVenue).toHaveBeenCalledWith(input);
    expect(store.rows().map((row) => row.venue.id)).toContain(other.id);
  });

  it('rejects a venue the API refuses and leaves the list alone', async () => {
    const store = setup(
      {
        venues: vi.fn().mockResolvedValue([venue]),
        pending: vi.fn().mockResolvedValue([]),
        createVenue: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 400 })),
      },
      true,
    );
    await settle();
    const input = { name: other.name, address: other.address, location: other.location };
    await expect(store.create(input)).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(store.rows().map((row) => row.venue.id)).toEqual([VENUE_ID]);
  });
});
