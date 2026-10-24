import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MenuApiClient } from '@menu/web/menus/data-access';
import { Roles } from '@menu/web/shared/util-auth';
import { I18n } from '@menu/web/shared/util-i18n';
import { classic, menuApi, VENUE_ID } from '../testing/manage-fixtures';
import { VenueManagerPage } from './venue-manager-page';

describe('VenueManagerPage', () => {
  async function render(api: Partial<MenuApiClient>, isAdmin = false): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'manage/venues/:id', component: VenueManagerPage }],
          withComponentInputBinding(),
        ),
        { provide: MenuApiClient, useValue: api },
      ],
    });
    TestBed.inject(I18n).setLanguage('he');
    TestBed.inject(Roles).set({ isAdmin, ownedVenueIds: isAdmin ? [] : [VENUE_ID] });
    const harness = await RouterTestingHarness.create(`/manage/venues/${VENUE_ID}`);
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(harness.routeNativeElement?.querySelector('mat-spinner')).toBeNull();
    });
    const element = harness.routeNativeElement;
    if (!element) {
      throw new Error('No page');
    }
    return element;
  }

  function tabs(element: HTMLElement): { label: string; selected: boolean }[] {
    return [...element.querySelectorAll('[role="tab"]')].map((tab) => ({
      label: tab.textContent.trim(),
      selected: tab.getAttribute('aria-selected') === 'true',
    }));
  }

  it('opens an Owner on the pending queue when items wait, without the Admin links', async () => {
    const element = await render(menuApi());
    expect(element.querySelector('h1')?.textContent).toBe('בורגר 24');
    expect(element.querySelector('.crumbs')?.textContent).toBe('המקומות שלי · בעלים');
    expect(tabs(element)).toEqual([
      { label: 'לאישור · 1', selected: true },
      { label: 'תפריט', selected: false },
      { label: 'תובנות', selected: false },
    ]);
    expect(element.querySelector('menu-pending-queue')).not.toBeNull();
    expect(element.querySelector('nav.admin')).toBeNull();
  });

  it('opens on the menu when nothing waits, and gives an Admin the edit and owners links', async () => {
    const element = await render(menuApi({ items: () => Promise.resolve([classic]) }), true);
    expect(element.querySelector('.ok')?.textContent).toContain('תפריט מעודכן');
    expect(tabs(element)[1]?.selected).toBe(true);
    expect(element.querySelector('menu-menu-editor')).not.toBeNull();
    expect(element.querySelector('a.edit')?.getAttribute('href')).toBe(
      `/manage/venues/${VENUE_ID}/edit`,
    );
    expect(element.querySelector('a.owners')?.getAttribute('href')).toBe(
      `/manage/people/owners/${VENUE_ID}`,
    );
  });

  it('says so when the venue is not one the user manages', async () => {
    const forbidden = new HttpErrorResponse({ status: 403 });
    const element = await render(menuApi({ venue: vi.fn().mockRejectedValue(forbidden) }));
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('המקום לא נמצא');
    expect(element.querySelector('[role="alert"] a')?.getAttribute('href')).toBe('/manage');
  });
});
