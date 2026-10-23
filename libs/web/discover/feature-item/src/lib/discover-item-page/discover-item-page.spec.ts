import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AUTH_BACKEND, FakeAuthBackend } from '@menu/web/shared/util-auth';
import { webDiscoverFeatureItemRoutes } from '../lib.routes';
import { type DiscoverItem, type ItemPage } from '@menu/shared/contracts';
import { DeviceLocation, DeviceShare, DiscoverApiClient } from '@menu/web/discover/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { DiscoverItemPage } from './discover-item-page';

describe('DiscoverItemPage', () => {
  const item: DiscoverItem = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'המבורגר הבית' },
    venue: { id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10', name: { he: 'מוזס' } },
    sectionId: '5c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
    tagIds: [],
    distanceMeters: null,
    score: 4.6,
    ratingCount: 12,
    wouldOrderAgainPercent: 92,
    latestPrice: 6800,
    writtenByMe: false,
  };
  const page: ItemPage = {
    item,
    archived: false,
    tags: [
      {
        id: '9a1d3c4e-3333-4c1c-9a57-6f7a5d3c2b10',
        slug: 'hamburger',
        name: { he: 'המבורגר' },
        kind: 'dish',
      },
    ],
    priceHistory: [{ month: '2026-09', averagePrice: 6500, count: 3 }],
    alsoGoodHere: [{ ...item, id: '1e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10', name: { he: 'צ׳יפס' } }],
  };

  async function render(load: DiscoverApiClient['item'], share = vi.fn()) {
    TestBed.configureTestingModule({
      imports: [DiscoverItemPage],
      providers: [
        provideRouter([]),
        { provide: DiscoverApiClient, useValue: { item: load } },
        { provide: DeviceLocation, useValue: { locate: () => Promise.resolve(null) } },
        { provide: DeviceShare, useValue: { share } },
      ],
    });
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(DiscoverItemPage);
    fixture.componentRef.setInput('id', item.id);
    await fixture.whenStable();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).querySelector('mat-spinner')).toBeNull();
    });
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('shows the score, the numbers, the price history and more at the venue', async () => {
    const load = vi.fn().mockResolvedValue(page);
    const { element } = await render(load);
    expect(load).toHaveBeenCalledWith(item.id, null);
    expect(element.querySelector('h1')?.textContent).toBe('המבורגר הבית');
    expect(element.querySelector('.venue')?.getAttribute('href')).toBe(`/venues/${item.venue.id}`);
    expect(element.querySelector('mat-chip')?.textContent).toContain('המבורגר');
    expect([...element.querySelectorAll('dd')].map((dd) => dd.textContent.trim())).toEqual([
      '92%',
      '₪68',
      '12',
    ]);
    expect(element.querySelector('menu-price-history')).not.toBeNull();
    expect(element.querySelector('section h2')?.textContent).toBe('עוד טעים במוזס');
    expect(element.querySelector('menu-item-row')?.textContent).toContain('צ׳יפס');
  });

  it('explains a missing score and an archived item', async () => {
    const quiet = {
      ...item,
      score: null,
      ratingCount: 0,
      wouldOrderAgainPercent: null,
      latestPrice: null,
    };
    const { element } = await render(
      vi.fn().mockResolvedValue({ ...page, item: quiet, archived: true, priceHistory: [] }),
    );
    expect(element.querySelector('.score')?.textContent).toContain('היו הראשונים');
    expect(element.querySelector('[role=note]')?.textContent).toContain('כבר לא בתפריט');
    expect(element.querySelector('menu-price-history')).toBeNull();
  });

  it('says when the item does not exist', async () => {
    const { element } = await render(
      vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 404 })),
    );
    expect(element.querySelector('[role=status]')?.textContent).toContain('לא נמצא');
  });

  it('offers to try again after a failure', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(page);
    const { fixture, element } = await render(load);
    element.querySelector<HTMLButtonElement>('[role=alert] button')?.click();
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(element.querySelector('h1')).not.toBeNull();
    });
  });

  it('shares the item', async () => {
    const share = vi.fn().mockResolvedValue('shared');
    const { fixture, element } = await render(vi.fn().mockResolvedValue(page), share);
    element.querySelector<HTMLButtonElement>('button[aria-label="שיתוף"]')?.click();
    await fixture.whenStable();
    expect(share).toHaveBeenCalledWith(`/items/${item.id}`, 'המבורגר הבית');
  });

  it('opens from its address, with the id from the route', async () => {
    const load = vi.fn().mockResolvedValue(page);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'items/:id', children: webDiscoverFeatureItemRoutes }],
          withComponentInputBinding(),
        ),
        { provide: DiscoverApiClient, useValue: { item: load } },
        { provide: DeviceLocation, useValue: { locate: () => Promise.resolve(null) } },
        { provide: AUTH_BACKEND, useValue: new FakeAuthBackend() },
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/items/${item.id}`);
    expect(load).toHaveBeenCalledWith(item.id, null);
  });

  it('goes to discover from a shared link, where there is no back', async () => {
    const { fixture, element } = await render(vi.fn().mockResolvedValue(page));
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    element.querySelector<HTMLButtonElement>('button[aria-label="חזרה"]')?.click();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/');
  });
});
