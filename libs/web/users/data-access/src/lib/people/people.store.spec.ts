import { HttpErrorResponse } from '@angular/common/http';
import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PeopleApiClient } from './people.api-client';
import { PeopleStore } from './people.store';

const VENUE_ID = '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';
const yossi = {
  id: '2f9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  displayName: 'Yossi',
  isAdmin: false,
  isContributor: false,
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

const application = {
  id: '5f9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  note: 'I eat out every week',
  status: 'pending' as const,
  createdAt: '2026-10-22T20:00:00.000Z',
  decidedAt: null,
  account: { id: dana.id, displayName: 'Dana' },
};

describe('PeopleStore', () => {
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  function setup(api: Partial<PeopleApiClient>) {
    TestBed.configureTestingModule({
      providers: [
        PeopleStore,
        {
          provide: PeopleApiClient,
          useValue: {
            accounts: vi.fn().mockResolvedValue([phone, yossi, dana]),
            owners: vi.fn().mockResolvedValue([owner]),
            applications: vi.fn().mockResolvedValue([application]),
            ...api,
          },
        },
      ],
    });
    return TestBed.inject(PeopleStore);
  }

  it('lists named accounts by name, unnamed ones last', async () => {
    const store = setup({});
    store.load(() => null);
    await settle();
    expect(store.sorted().map((account) => account.id)).toEqual([dana.id, yossi.id, phone.id]);
    expect(store.owners()).toEqual([]);
  });

  it('loads a venue’s Owners and offers only the others as new ones', async () => {
    const store = setup({});
    store.load(() => VENUE_ID);
    await settle();
    expect(store.owners()).toEqual([owner]);
    expect(store.candidates().map((account) => account.id)).toEqual([phone.id, dana.id]);
  });

  it('records a failed load', async () => {
    const store = setup({ accounts: vi.fn().mockRejectedValue(new Error('offline')) });
    store.load(() => null);
    await settle();
    expect(store.status()).toBe('error');
  });

  it('loads pending applications with the accounts, not with a venue’s Owners', async () => {
    const applications = vi.fn().mockResolvedValue([application]);
    const store = setup({ applications });
    store.load(() => null);
    await settle();
    expect(store.applications()).toEqual([application]);
    store.load(() => VENUE_ID);
    await settle();
    expect(applications).toHaveBeenCalledTimes(1);
  });

  it('approves an application and shows the account as a Contributor', async () => {
    const decide = vi.fn().mockResolvedValue({ ...application, status: 'approved' });
    const store = setup({ decide });
    store.load(() => null);
    await settle();
    await store.decide(application.id, 'approve');
    expect(decide).toHaveBeenCalledWith(application.id, 'approve');
    expect(store.applications()).toEqual([]);
    expect(store.accounts().find((account) => account.id === dana.id)?.isContributor).toBe(true);
  });

  it('rejects an application without changing the account', async () => {
    const store = setup({
      decide: vi.fn().mockResolvedValue({ ...application, status: 'rejected' }),
    });
    store.load(() => null);
    await settle();
    await store.decide(application.id, 'reject');
    expect(store.applications()).toEqual([]);
    expect(store.accounts().find((account) => account.id === dana.id)?.isContributor).toBe(false);
  });

  it('keeps the application when deciding fails', async () => {
    const store = setup({
      decide: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 500 })),
    });
    store.load(() => null);
    await settle();
    await expect(store.decide(application.id, 'approve')).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(store.applications()).toEqual([application]);
  });

  it('takes the Contributor role back', async () => {
    const setContributor = vi.fn().mockResolvedValue({ ...yossi, isContributor: false });
    const store = setup({
      accounts: vi.fn().mockResolvedValue([{ ...yossi, isContributor: true }]),
      setContributor,
    });
    store.load(() => null);
    await settle();
    await store.setContributor(yossi.id, false);
    expect(store.accounts()[0]?.isContributor).toBe(false);
  });

  it('makes an account an Admin', async () => {
    const setAdmin = vi.fn().mockResolvedValue({ ...dana, isAdmin: true });
    const store = setup({ setAdmin });
    store.load(() => null);
    await settle();
    await store.setAdmin(dana.id, true);
    expect(store.sorted()[0]?.isAdmin).toBe(true);
  });

  it('keeps the flag when the API refuses', async () => {
    const store = setup({
      setAdmin: vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 400 })),
    });
    store.load(() => null);
    await settle();
    await expect(store.setAdmin(dana.id, true)).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(store.sorted()[0]?.isAdmin).toBe(false);
  });

  it('grants and revokes ownership of the venue', async () => {
    const grant = vi.fn().mockResolvedValue({ ...owner, accountId: dana.id, displayName: 'Dana' });
    const revoke = vi.fn().mockResolvedValue(undefined);
    const store = setup({ grant, revoke });
    store.load(() => VENUE_ID);
    await settle();
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
    const venueId = signal(VENUE_ID);
    store.load(venueId);
    TestBed.tick();
    venueId.set(OTHER);
    TestBed.tick();
    await vi.waitFor(() => {
      expect(answers.has(OTHER)).toBe(true);
    });
    answers.get(OTHER)?.([]);
    answers.get(VENUE_ID)?.([owner]);
    await settle();
    expect(store.venueId()).toBe(OTHER);
    expect(store.owners()).toEqual([]);
  });
});
