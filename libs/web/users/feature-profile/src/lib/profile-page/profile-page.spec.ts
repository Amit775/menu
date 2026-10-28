import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountStore, ContributorApplicationApiClient } from '@menu/web/users/data-access';
import { AUTH_BACKEND, FakeAuthBackend } from '@menu/web/shared/util-auth';
import { ProfilePage } from './profile-page';

describe('ProfilePage', () => {
  const account = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    displayName: 'נועה',
    language: 'he' as const,
    isAdmin: false,
    isContributor: false,
    ownedVenueIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  const signedIn = (): FakeAuthBackend =>
    new FakeAuthBackend({ uid: 'u1', displayName: 'נועה', phoneNumber: null });

  async function setup(
    backend: FakeAuthBackend,
    error: string | null = null,
    roles: Partial<typeof account> = {},
  ) {
    const store = {
      account: signal({ ...account, ...roles }),
      error: signal(error),
      update: vi.fn().mockResolvedValue(true),
      setLanguage: vi.fn().mockResolvedValue(undefined),
    };
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideRouter([]),
        { provide: AUTH_BACKEND, useValue: backend },
        { provide: AccountStore, useValue: store },
        {
          provide: ContributorApplicationApiClient,
          useValue: {
            mine: () => Promise.resolve({ application: null, canApplyFrom: account.createdAt }),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProfilePage);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement, store, backend };
  }

  it('invites a visitor to sign in', async () => {
    const { element } = await setup(new FakeAuthBackend());
    expect(element.querySelector('a[href="/sign-in"]')?.textContent).toContain('כניסה');
    expect(element.querySelector('input')).toBeNull();
    expect(element.querySelector('a.diary')).toBeNull();
  });

  it('shows and saves the display name when signed in', async () => {
    const { fixture, element, store } = await setup(
      new FakeAuthBackend({ uid: 'u1', displayName: 'נועה', phoneNumber: null }),
    );
    const input = element.querySelector<HTMLInputElement>('input');
    expect(input?.value).toBe('נועה');
    expect(element.querySelector('a.diary')?.getAttribute('href')).toBe('/diary');
    expect(element.querySelector('a.want-to-try')?.getAttribute('href')).toBe('/saved');
    if (input) {
      input.value = 'נועה כ.';
      input.dispatchEvent(new Event('input'));
    }
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(store.update).toHaveBeenCalledWith({ displayName: 'נועה כ.' });
    expect(element.querySelector('[role=status]')?.textContent).toContain('נשמר');
  });

  it('invites a user to apply as a Contributor', async () => {
    const { element } = await setup(signedIn());
    await vi.waitFor(() => {
      expect(element.querySelector('menu-contributor-application h2')?.textContent).toBe(
        'הצטרפות לתורמים',
      );
    });
  });

  it('tells a Contributor what they may do instead', async () => {
    const { element } = await setup(signedIn(), null, { isContributor: true });
    expect(element.querySelector('.contributor')?.textContent).toContain('אתם בין התורמים');
    expect(element.querySelector('menu-contributor-application')).toBeNull();
  });

  it('shows an Admin neither', async () => {
    const { element } = await setup(signedIn(), null, { isAdmin: true });
    expect(element.querySelector('.contributor')).toBeNull();
    expect(element.querySelector('menu-contributor-application')).toBeNull();
  });

  it('switches the language', async () => {
    const { element, store } = await setup(new FakeAuthBackend());
    [...element.querySelectorAll('button')].find((b) => b.textContent.includes('English'))?.click();
    expect(store.setLanguage).toHaveBeenCalledWith('en');
  });

  it('does not save a name of only spaces', async () => {
    const { fixture, element } = await setup(signedIn());
    const input = element.querySelector<HTMLInputElement>('input');
    if (input) {
      input.value = '   ';
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
    const save = [...element.querySelectorAll('button')].find((b) =>
      b.textContent.includes('שמירה'),
    );
    expect(save?.disabled).toBe(true);
  });

  it('shows when the account cannot load', async () => {
    const { element } = await setup(signedIn(), 'load-failed');
    expect(element.querySelector('[role=alert]')?.textContent).toContain('לא הצלחנו לטעון');
  });

  it('shows when saving fails', async () => {
    const { element } = await setup(signedIn(), 'save-failed');
    expect(element.querySelector('[role=alert]')?.textContent).toContain('השמירה לא הצליחה');
  });

  it('signs out', async () => {
    const { fixture, element, backend } = await setup(signedIn());
    [...element.querySelectorAll('button')].find((b) => b.textContent.includes('יציאה'))?.click();
    await fixture.whenStable();
    expect(backend.calls()).toContain('sign-out');
    expect(element.querySelector('a[href="/sign-in"]')).not.toBeNull();
  });
});
