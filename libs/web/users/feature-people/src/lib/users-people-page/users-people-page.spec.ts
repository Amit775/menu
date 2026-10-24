import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type Account, type AccountSummary } from '@menu/shared/contracts';
import { AccountStore, PeopleApiClient } from '@menu/web/users/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { UsersPeoplePage } from './users-people-page';

const me: AccountSummary = {
  id: '1a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  displayName: 'עמית',
  isAdmin: true,
  createdAt: '2026-10-01T10:00:00.000Z',
};
const dana: AccountSummary = {
  id: '2a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  displayName: 'דנה',
  isAdmin: false,
  createdAt: '2026-10-02T10:00:00.000Z',
};
const unnamed: AccountSummary = {
  id: '3a1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  displayName: '',
  isAdmin: false,
  createdAt: '2026-10-03T10:00:00.000Z',
};

describe('UsersPeoplePage', () => {
  async function render(api: Partial<PeopleApiClient>): Promise<HTMLElement> {
    const account = signal<Partial<Account>>({ id: me.id });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: PeopleApiClient, useValue: api },
        { provide: AccountStore, useValue: { account } },
      ],
    });
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(UsersPeoplePage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const accounts = (): Promise<AccountSummary[]> => Promise.resolve([unnamed, me, dana]);

  function toggle(element: HTMLElement, id: string): HTMLButtonElement {
    const button = element.querySelector<HTMLButtonElement>(
      `[data-id="${id}"] button[role="switch"]`,
    );
    if (!button) {
      throw new Error(`No switch for ${id}`);
    }
    return button;
  }

  it('lists named accounts first and marks the Admins', async () => {
    const element = await render({ accounts });
    const names = [...element.querySelectorAll('.name')].map((name) => name.textContent);
    expect(names).toEqual(['דנה', 'עמית', 'בלי שם']);
    expect(toggle(element, me.id).getAttribute('aria-checked')).toBe('true');
    expect(toggle(element, dana.id).getAttribute('aria-checked')).toBe('false');
    expect(toggle(element, dana.id).getAttribute('aria-label')).toBe('דנה: מנהל');
  });

  it('makes someone an Admin', async () => {
    const setAdmin = vi.fn().mockResolvedValue({ ...dana, isAdmin: true });
    const element = await render({ accounts, setAdmin });
    toggle(element, dana.id).click();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(toggle(element, dana.id).getAttribute('aria-checked')).toBe('true');
    });
    expect(setAdmin).toHaveBeenCalledWith(dana.id, true);
  });

  it('does not let an Admin remove their own role', async () => {
    const element = await render({ accounts });
    expect(toggle(element, me.id).disabled).toBe(true);
    expect(element.querySelector(`[data-id="${me.id}"] .hint`)?.textContent).toBe(
      'אי אפשר להסיר את תפקיד המנהל של עצמכם.',
    );
  });

  it('says so when the change is refused', async () => {
    const element = await render({
      accounts,
      setAdmin: vi.fn().mockRejectedValue(new Error('400')),
    });
    toggle(element, dana.id).click();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector(`[data-id="${dana.id}"] [role="alert"]`)?.textContent).toBe(
        'השינוי לא נשמר. נסו שוב.',
      );
    });
    expect(toggle(element, dana.id).getAttribute('aria-checked')).toBe('false');
  });

  it('offers to try again when loading fails', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([dana]);
    const element = await render({ accounts: load });
    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('.name')?.textContent).toBe('דנה');
    });
  });
});
