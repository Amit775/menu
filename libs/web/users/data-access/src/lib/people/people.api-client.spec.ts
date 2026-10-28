import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PeopleApiClient } from './people.api-client';

const VENUE_ID = '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';
const ACCOUNT_ID = '2f9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10';
const summary = {
  id: ACCOUNT_ID,
  displayName: 'Yossi',
  isAdmin: false,
  isContributor: false,
  createdAt: '2026-10-20T20:00:00.000Z',
};
const ownership = {
  accountId: ACCOUNT_ID,
  venueId: VENUE_ID,
  displayName: 'Yossi',
  grantedAt: '2026-10-21T20:00:00.000Z',
};

const application = {
  id: '5f9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  note: 'I eat out every week',
  status: 'pending',
  createdAt: '2026-10-22T20:00:00.000Z',
  decidedAt: null,
  account: { id: ACCOUNT_ID, displayName: 'Yossi' },
};

describe('PeopleApiClient', () => {
  let client: PeopleApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(PeopleApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('lists accounts', async () => {
    const result = client.accounts();
    http.expectOne('/api/accounts').flush([summary]);
    await expect(result).resolves.toEqual([summary]);
  });

  it('rejects an account list that breaks the contract', async () => {
    const result = client.accounts();
    http.expectOne('/api/accounts').flush([{ id: 'nope' }]);
    await expect(result).rejects.toThrow();
  });

  it('lists pending contributor applications', async () => {
    const result = client.applications();
    http.expectOne('/api/contributor-applications').flush([application]);
    await expect(result).resolves.toEqual([application]);
  });

  it('rejects an application that breaks the contract', async () => {
    const result = client.applications();
    http.expectOne('/api/contributor-applications').flush([{ ...application, note: '' }]);
    await expect(result).rejects.toThrow();
  });

  it('decides on an application', async () => {
    const result = client.decide(application.id, 'approve');
    const request = http.expectOne(`/api/contributor-applications/${application.id}/approve`);
    expect(request.request.method).toBe('POST');
    request.flush({ ...application, status: 'approved', decidedAt: '2026-10-23T20:00:00.000Z' });
    await expect(result).resolves.toMatchObject({ status: 'approved' });
  });

  it('grants and takes back the Contributor role', async () => {
    const result = client.setContributor(ACCOUNT_ID, false);
    const request = http.expectOne(`/api/accounts/${ACCOUNT_ID}/contributor`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ isContributor: false });
    request.flush(summary);
    await expect(result).resolves.toEqual(summary);
  });

  it('makes an account an Admin', async () => {
    const result = client.setAdmin(ACCOUNT_ID, true);
    const request = http.expectOne(`/api/accounts/${ACCOUNT_ID}/admin`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({ isAdmin: true });
    request.flush({ ...summary, isAdmin: true });
    await expect(result).resolves.toMatchObject({ isAdmin: true });
  });

  it('lists, grants and revokes a venue’s Owners', async () => {
    const owners = client.owners(VENUE_ID);
    http.expectOne(`/api/ownerships?venueId=${VENUE_ID}`).flush([ownership]);
    await expect(owners).resolves.toEqual([ownership]);

    const granted = client.grant(VENUE_ID, ACCOUNT_ID);
    const post = http.expectOne('/api/ownerships');
    expect(post.request.body).toEqual({ venueId: VENUE_ID, accountId: ACCOUNT_ID });
    post.flush(ownership);
    await expect(granted).resolves.toEqual(ownership);

    const revoked = client.revoke(VENUE_ID, ACCOUNT_ID);
    const remove = http.expectOne(`/api/ownerships/${VENUE_ID}/${ACCOUNT_ID}`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null, { status: 204, statusText: 'No Content' });
    await expect(revoked).resolves.toBeUndefined();
  });

  it('rejects an ownership that breaks the contract', async () => {
    const result = client.grant(VENUE_ID, ACCOUNT_ID);
    http.expectOne('/api/ownerships').flush({ venueId: VENUE_ID });
    await expect(result).rejects.toThrow();
  });
});
