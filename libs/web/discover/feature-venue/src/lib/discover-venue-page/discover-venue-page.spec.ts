import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { type DiscoverItem, type VenuePage } from '@menu/shared/contracts';
import { DiscoverApiClient } from '@menu/web/discover/data-access';
import { DeviceLocation } from '@menu/web/shared/util-device';
import { I18n } from '@menu/web/shared/util-i18n';
import { DiscoverVenuePage } from './discover-venue-page';

describe('DiscoverVenuePage', () => {
  const VENUE_ID = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
  const SECTION_ID = '5c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10';
  const item: DiscoverItem = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'המבורגר הבית' },
    venue: { id: VENUE_ID, name: { he: 'מוזס' } },
    sectionId: SECTION_ID,
    tagIds: [],
    distanceMeters: 350,
    score: 4.6,
    ratingCount: 12,
    wouldOrderAgainPercent: 92,
    latestPrice: 6800,
    writtenByMe: false,
  };
  const page: VenuePage = {
    venue: {
      id: VENUE_ID,
      name: { he: 'מוזס' },
      address: 'רוטשילד 35, תל אביב',
      location: { lat: 32.0641, lng: 34.7744 },
      phone: '03-566 4949',
      reservationUrl: null,
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    distanceMeters: 1234,
    topItems: [item],
    sections: [
      {
        section: { id: SECTION_ID, venueId: VENUE_ID, name: { he: 'עיקריות' }, position: 0 },
        items: [item],
      },
    ],
    myEntryCount: 2,
  };

  it('goes to discover from a shared link, where there is no back', async () => {
    const element = await render(vi.fn().mockResolvedValue(page));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    element.querySelector<HTMLButtonElement>('button[aria-label="חזרה"]')?.click();
    expect(navigate).toHaveBeenCalledWith('/');
  });

  async function render(load: DiscoverApiClient['venue']) {
    TestBed.configureTestingModule({
      imports: [DiscoverVenuePage],
      providers: [
        provideRouter([]),
        { provide: DiscoverApiClient, useValue: { venue: load } },
        { provide: DeviceLocation, useValue: { locate: () => Promise.resolve(null) } },
      ],
    });
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(DiscoverVenuePage);
    fixture.componentRef.setInput('id', VENUE_ID);
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('mat-spinner')).toBeNull();
    });
    return fixture.nativeElement as HTMLElement;
  }

  it('shows where the venue is, how to reach it and the menu by section', async () => {
    const element = await render(vi.fn().mockResolvedValue(page));
    expect(element.querySelector('h1')?.textContent).toBe('מוזס');
    expect(element.querySelector('.address')?.textContent).toContain('1.2 ק״מ');
    const links = [...element.querySelectorAll('.actions a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['https://waze.com/ul?ll=32.0641,34.7744&navigate=yes', 'tel:035664949']);
    expect(element.querySelector('.mine')?.textContent).toBe('2 רשומות שלך כאן');
    expect(element.querySelector('h3')?.textContent).toBe('עיקריות');
    expect(element.querySelectorAll('menu-item-row')).toHaveLength(2);
  });

  it('says when the menu is not in yet', async () => {
    const element = await render(
      vi.fn().mockResolvedValue({ ...page, topItems: [], sections: [], myEntryCount: 0 }),
    );
    expect(element.querySelector('.empty')?.textContent).toContain('עוד לא הוזן');
    expect(element.querySelector('.mine')).toBeNull();
  });

  it('says when the venue does not exist, or failed to load', async () => {
    const missing = await render(vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 404 })));
    expect(missing.querySelector('[role=status]')?.textContent).toContain('לא נמצא');
    TestBed.resetTestingModule();
    const failed = await render(vi.fn().mockRejectedValue(new Error('offline')));
    expect(failed.querySelector('[role=alert]')?.textContent).toContain('לא הצלחנו');
  });
});
