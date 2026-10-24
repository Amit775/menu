import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type Item, type Venue } from '@menu/shared/contracts';
import { MenuApiClient } from '@menu/web/menus/data-access';
import { Roles } from '@menu/web/shared/util-auth';
import { I18n } from '@menu/web/shared/util-i18n';
import { MenusManagePage } from './menus-manage-page';

const VENUE_ID = '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';
const venue: Venue = {
  id: VENUE_ID,
  name: { he: 'בורגר 24' },
  address: 'דיזנגוף 100, תל אביב',
  location: { lat: 32.08, lng: 34.77 },
  phone: null,
  reservationUrl: null,
  status: 'active',
  createdAt: '2026-10-01T10:00:00.000Z',
};
const quiet: Venue = {
  ...venue,
  id: '1c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10',
  name: { he: 'מוזס' },
  status: 'hidden',
};
const pending: Item = {
  id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  venueId: VENUE_ID,
  sectionId: '5c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
  name: { he: 'בורגר כבש' },
  listPrice: 7200,
  tagIds: [],
  state: 'pending',
  mergedIntoId: null,
  submittedByMe: false,
  position: 0,
  createdAt: '2026-10-21T10:00:00.000Z',
};

describe('MenusManagePage', () => {
  async function render(api: Partial<MenuApiClient>, isAdmin = false): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: MenuApiClient, useValue: api }],
    });
    TestBed.inject(I18n).setLanguage('he');
    TestBed.inject(Roles).set({ isAdmin, ownedVenueIds: isAdmin ? [] : [VENUE_ID] });
    const fixture = TestBed.createComponent(MenusManagePage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('lists an Owner’s venues with what waits for approval, and no Admin links', async () => {
    const venues = vi.fn().mockResolvedValue([venue]);
    const element = await render({ venues, pending: vi.fn().mockResolvedValue([pending]) });
    expect(venues).toHaveBeenCalledWith(true);
    expect(element.querySelector('.role')?.textContent).toBe('בעלים');
    expect(element.querySelector('.waiting')?.textContent).toBe('פריט אחד ממתין לאישור');
    const row = element.querySelector('a.venue');
    expect(row?.getAttribute('href')).toBe(`/manage/venues/${VENUE_ID}`);
    expect(row?.textContent).toContain('בורגר 24');
    expect(row?.querySelector('.chip')?.textContent).toBe('לאישור · 1');
    expect(element.querySelector('nav.admin')).toBeNull();
  });

  it('gives an Admin every venue, marks hidden ones and links to the Admin pages', async () => {
    const venues = vi.fn().mockResolvedValue([quiet, venue]);
    const element = await render({ venues, pending: vi.fn().mockResolvedValue([]) }, true);
    expect(venues).toHaveBeenCalledWith(false);
    expect(element.querySelector('.waiting')).toBeNull();
    expect(element.querySelector('.chip.muted')?.textContent).toBe('מוסתר');
    const links = [...element.querySelectorAll('nav.admin a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/manage/venues/new', '/manage/tags', '/manage/people']);
  });

  it('offers to try again when loading fails', async () => {
    const venues = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([venue]);
    const element = await render({ venues, pending: vi.fn().mockResolvedValue([]) });
    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    await vi.waitFor(() => {
      expect(venues).toHaveBeenCalledTimes(2);
    });
  });
});
