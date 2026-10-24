import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { type AccountSummary, type Ownership } from '@menu/shared/contracts';
import { PeopleApiClient } from '@menu/web/users/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { VenueOwnersPage } from './venue-owners-page';

const VENUE_ID = '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';
const dana: AccountSummary = {
  id: '2a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  displayName: 'דנה',
  isAdmin: false,
  createdAt: '2026-10-02T10:00:00.000Z',
};
const yossi: AccountSummary = {
  ...dana,
  id: '4a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  displayName: 'יוסי',
};
const owner: Ownership = {
  accountId: dana.id,
  venueId: VENUE_ID,
  displayName: dana.displayName,
  grantedAt: '2026-10-10T10:00:00.000Z',
};

describe('VenueOwnersPage', () => {
  async function render(api: Partial<PeopleApiClient>): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [{ path: 'manage/people/owners/:venueId', component: VenueOwnersPage }],
          withComponentInputBinding(),
        ),
        { provide: PeopleApiClient, useValue: api },
      ],
    });
    TestBed.inject(I18n).setLanguage('he');
    const harness = await RouterTestingHarness.create(`/manage/people/owners/${VENUE_ID}`);
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

  const base = {
    accounts: () => Promise.resolve([dana, yossi]),
    owners: vi.fn().mockResolvedValue([owner]),
  };

  it('lists the venue’s owners and offers only accounts that are not one yet', async () => {
    const owners = vi.fn().mockResolvedValue([owner]);
    const element = await render({ ...base, owners });
    expect(owners).toHaveBeenCalledWith(VENUE_ID);
    expect([...element.querySelectorAll('li .name')].map((name) => name.textContent)).toEqual([
      'דנה',
    ]);
    expect(element.querySelector('a.back')?.getAttribute('href')).toBe(
      `/manage/venues/${VENUE_ID}`,
    );
    element.querySelector<HTMLElement>('.mat-mdc-select-trigger')?.click();
    TestBed.tick();
    const options = [...TestBed.inject(DOCUMENT).querySelectorAll('mat-option')];
    expect(options.map((option) => option.textContent.trim())).toEqual(['יוסי']);
  });

  it('grants ownership to the picked account', async () => {
    const grant = vi.fn().mockResolvedValue({ ...owner, accountId: yossi.id, displayName: 'יוסי' });
    const element = await render({ ...base, grant });
    const button = element.querySelector<HTMLButtonElement>('.grant-button');
    expect(button?.disabled).toBe(true);
    element.querySelector<HTMLElement>('.mat-mdc-select-trigger')?.click();
    TestBed.tick();
    TestBed.inject(DOCUMENT).querySelector<HTMLElement>('mat-option')?.click();
    TestBed.tick();
    button?.click();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelectorAll('li')).toHaveLength(2);
    });
    expect(grant).toHaveBeenCalledWith(VENUE_ID, yossi.id);
    expect(element.querySelector('.empty')?.textContent).toBe('כל החשבונות כבר בעלים של המקום.');
  });

  it('revokes ownership on the second tap', async () => {
    const revoke = vi.fn().mockResolvedValue(undefined);
    const element = await render({ ...base, revoke });
    element.querySelector<HTMLButtonElement>('.revoke')?.click();
    TestBed.tick();
    expect(revoke).not.toHaveBeenCalled();
    expect(element.querySelector('.hint')?.textContent.trim()).toBe(
      'דנה לא ינהל יותר את המקום. לחצו שוב לאישור.',
    );
    element.querySelector<HTMLButtonElement>('.revoke')?.click();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('.empty')?.textContent).toBe('אין עדיין בעלים למקום הזה.');
    });
    expect(revoke).toHaveBeenCalledWith(VENUE_ID, dana.id);
  });

  it('says so when a change fails', async () => {
    const element = await render({ ...base, revoke: vi.fn().mockRejectedValue(new Error('404')) });
    element.querySelector<HTMLButtonElement>('.revoke')?.click();
    TestBed.tick();
    element.querySelector<HTMLButtonElement>('.revoke')?.click();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('[role="alert"]')?.textContent).toBe('השינוי לא נשמר. נסו שוב.');
    });
  });
});
