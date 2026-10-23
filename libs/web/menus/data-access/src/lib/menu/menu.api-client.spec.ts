import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { item, section, venue, VENUE_ID } from '../testing/fixtures';
import { MenuApiClient } from './menu.api-client';

describe('MenuApiClient', () => {
  let client: MenuApiClient;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(MenuApiClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('reads a venue', async () => {
    const result = client.venue(VENUE_ID);
    http.expectOne(`/api/venues/${VENUE_ID}`).flush(venue);
    await expect(result).resolves.toEqual(venue);
  });

  it('rejects a venue that breaks the contract', async () => {
    const result = client.venue(VENUE_ID);
    http.expectOne(`/api/venues/${VENUE_ID}`).flush({ ...venue, name: 'מוזס' });
    await expect(result).rejects.toThrow();
  });

  it('reads the venue’s menu sections', async () => {
    const result = client.sections(VENUE_ID);
    http.expectOne(`/api/venues/${VENUE_ID}/sections`).flush([section]);
    await expect(result).resolves.toEqual([section]);
  });

  it('rejects a section without a name', async () => {
    const result = client.sections(VENUE_ID);
    http.expectOne(`/api/venues/${VENUE_ID}/sections`).flush([{ ...section, name: undefined }]);
    await expect(result).rejects.toThrow();
  });

  it('adds an item to the venue', async () => {
    const input = { sectionId: section.id, name: { he: 'שקשוקה' }, listPrice: 5400 };
    const result = client.addItem(VENUE_ID, input);
    const request = http.expectOne(`/api/venues/${VENUE_ID}/items`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(input);
    request.flush(item);
    await expect(result).resolves.toEqual(item);
  });

  it('rejects an added item that breaks the contract', async () => {
    const result = client.addItem(VENUE_ID, { sectionId: section.id, name: { he: 'שקשוקה' } });
    http.expectOne(`/api/venues/${VENUE_ID}/items`).flush({ ...item, state: 'unknown' });
    await expect(result).rejects.toThrow();
  });
});
