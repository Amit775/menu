import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { PeopleApiClient } from './people.api-client';
import { PeopleStore } from './people.store';

const VENUE_ID = '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';
const yossi = {
  id: '2f9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  displayName: 'Yossi',
  isAdmin: false,
  createdAt: '2026-10-20T20:00:00.000Z',
};
const dana = { ...yossi, id: '3f9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10', displayName: 'Dana' };
const phone = { ...yossi, id: '4f9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10', displayName: '' };
const owner = {
  accountId: yossi.id,
  venueId: VENUE_ID,
  displayName: 'Yossi',
  grantedAt: '2026-10-21T20:00:00.000Z',
};

describe('PeopleStore', () => {
  function setup(api: Partial<PeopleApiClient>) {
    TestBed.configureTestingModule({
      providers: [
        PeopleStore,
        {
          provide: PeopleApiClient,
          useValue: {
            accounts: vi.fn().mockResolvedValue([phone, yossi, dana]),
            owners: vi.fn().mockResolvedValue([owner]),
            ...api,
          },
        },
      ],
    });
    return TestBed.inject(PeopleStore);
  }

  it('lists named accounts by name, unnamed ones last', async () => {
    const store = setup({});
    await store.load();
    expect(store.sorted().map((account) => account.id)).toEqual([dana.id, yossi.id, phone.id]);
    expect(store.owners()).toEqual([]);
  });

  it('loads a venue’s Owners and offers only the others as new ones', async () => {
    const store = setup({});
    await store.load(VENUE_ID);
    expect(store.owners()).toEqual([owner]);
    expect(store.candidates().map((account) => account.id)).toEqual([phone.id, dana.id]);
  });

  it('records a failed load', async () => {
    const store = setup({ accounts: vi.fn().mockRejectedValue(new Error('offline')) });
    await store.load();
    expect(store.status()).toBe('error');
  });

  it('makes an account an Admin', async () => {
    const setAdmin = vi.fn().mockResolvedValue({ ...dana, isAdmin: true });
    const store = setup({ setAdmin });
    await store.load();
    await store.setAdmin(dana.id, true);
    expect(store.sorted()[0]?.isAdmin).toBe(true);
  });

  it('keeps the flag when the API refuses', async () => {
    const store = setup({
      setAdmin: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 400 })),
    });
    await store.load();
    await expect(store.setAdmin(dana.id, true)).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(store.sorted()[0]?.isAdmin).toBe(false);
  });

  it('grants and revokes ownership of the venue', async () => {
    const grant = vi.fn().mockResolvedValue({ ...owner, accountId: dana.id, displayName: 'Dana' });
    const revoke = vi.fn().mockResolvedValue(undefined);
    const store = setup({ grant, revoke });
    await store.load(VENUE_ID);
    await store.grant(dana.id);
    expect(grant).toHaveBeenCalledWith(VENUE_ID, dana.id);
    await store.revoke(yossi.id);
    expect(revoke).toHaveBeenCalledWith(VENUE_ID, yossi.id);
    expect(store.owners().map((o) => o.accountId)).toEqual([dana.id]);
  });

  it('keeps the owners of the venue loaded last', async () => {
    const answers = new Map<string, (value: (typeof owner)[]) => void>();
    const owners = vi.fn(
      (venueId: string) =>
        new Promise<(typeof owner)[]>((resolve) => answers.set(venueId, resolve)),
    );
    const store = setup({ owners });
    const OTHER = '8c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';
    const first = store.load(VENUE_ID);
    const second = store.load(OTHER);
    answers.get(OTHER)?.([]);
    answers.get(VENUE_ID)?.([owner]);
    await Promise.all([first, second]);
    expect(store.venueId()).toBe(OTHER);
    expect(store.owners()).toEqual([]);
  });
});
