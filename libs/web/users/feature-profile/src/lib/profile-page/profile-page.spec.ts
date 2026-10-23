import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AccountStore } from '@menu/web/users/data-access';
import { AUTH_BACKEND, FakeAuthBackend } from '@menu/web/shared/util-auth';
import { ProfilePage } from './profile-page';

describe('ProfilePage', () => {
  const account = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    displayName: 'נועה',
    language: 'he' as const,
    isAdmin: false,
    ownedVenueIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  async function setup(backend: FakeAuthBackend) {
    const store = {
      account: signal(account),
      error: signal(null),
      update: vi.fn().mockResolvedValue(true),
      setLanguage: vi.fn().mockResolvedValue(undefined),
    };
    await TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideRouter([]),
        { provide: AUTH_BACKEND, useValue: backend },
        { provide: AccountStore, useValue: store },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProfilePage);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement, store };
  }

  it('invites a visitor to sign in', async () => {
    const { element } = await setup(new FakeAuthBackend());
    expect(element.querySelector('a[href="/sign-in"]')?.textContent).toContain('כניסה');
    expect(element.querySelector('input')).toBeNull();
  });

  it('shows and saves the display name when signed in', async () => {
    const { fixture, element, store } = await setup(
      new FakeAuthBackend({ uid: 'u1', displayName: 'נועה', phoneNumber: null }),
    );
    const input = element.querySelector<HTMLInputElement>('input');
    expect(input?.value).toBe('נועה');
    if (input) {
      input.value = 'נועה כ.';
      input.dispatchEvent(new Event('input'));
    }
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(store.update).toHaveBeenCalledWith({ displayName: 'נועה כ.' });
    expect(element.querySelector('[role=status]')?.textContent).toContain('נשמר');
  });

  it('switches the language', async () => {
    const { element, store } = await setup(new FakeAuthBackend());
    [...element.querySelectorAll('button')].find((b) => b.textContent.includes('English'))?.click();
    expect(store.setLanguage).toHaveBeenCalledWith('en');
  });
});
