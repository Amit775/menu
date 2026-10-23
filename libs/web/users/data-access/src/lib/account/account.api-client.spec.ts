import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AccountApiClient } from './account.api-client';

describe('AccountApiClient', () => {
  let client: AccountApiClient;
  let http: HttpTestingController;
  const account = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    displayName: 'נועה',
    language: 'he',
    isAdmin: false,
    ownedVenueIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(AccountApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('loads and validates the signed-in account', async () => {
    const result = client.me();
    http.expectOne('/api/accounts/me').flush(account);
    await expect(result).resolves.toEqual(account);
  });

  it('sends changes to the account', async () => {
    const result = client.updateMe({ language: 'en' });
    const request = http.expectOne('/api/accounts/me');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ language: 'en' });
    request.flush({ ...account, language: 'en' });
    await expect(result).resolves.toMatchObject({ language: 'en' });
  });

  it('rejects a response that breaks the contract', async () => {
    const result = client.me();
    http.expectOne('/api/accounts/me').flush({ id: 'not-a-uuid' });
    await expect(result).rejects.toThrow();
  });
});
