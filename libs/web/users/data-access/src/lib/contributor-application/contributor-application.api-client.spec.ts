import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ContributorApplicationApiClient } from './contributor-application.api-client';

const application = {
  id: '5f9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  note: 'I eat out every week',
  status: 'pending',
  createdAt: '2026-10-22T20:00:00.000Z',
  decidedAt: null,
};

describe('ContributorApplicationApiClient', () => {
  let client: ContributorApplicationApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(ContributorApplicationApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it("reads the caller's application", async () => {
    const result = client.mine();
    http
      .expectOne('/api/accounts/me/contributor-application')
      .flush({ application, canApplyFrom: null });
    await expect(result).resolves.toEqual({ application, canApplyFrom: null });
  });

  it('rejects an answer that breaks the contract', async () => {
    const result = client.mine();
    http.expectOne('/api/accounts/me/contributor-application').flush({ application: {} });
    await expect(result).rejects.toThrow();
  });

  it('applies with a note', async () => {
    const result = client.apply(application.note);
    const request = http.expectOne('/api/accounts/me/contributor-application');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ note: application.note });
    request.flush(application);
    await expect(result).resolves.toEqual(application);
  });
});
