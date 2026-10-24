import { TestBed } from '@angular/core/testing';
import { AUTH_BACKEND, FakeAuthBackend, Roles } from '@menu/web/shared/util-auth';
import { I18n } from '@menu/web/shared/util-i18n';
import { AccountApiClient } from './account.api-client';
import { AccountStore } from './account.store';

describe('AccountStore', () => {
  const account = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    displayName: 'Noa',
    language: 'en' as const,
    isAdmin: false,
    ownedVenueIds: ['7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10'],
    createdAt: '2026-01-01T00:00:00.000Z',
  };

  function setup(api: Partial<AccountApiClient>, backend = new FakeAuthBackend()) {
    const setLanguage = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: AccountApiClient, useValue: api },
        { provide: AUTH_BACKEND, useValue: backend },
        { provide: I18n, useValue: { setLanguage } },
      ],
    });
    return { store: TestBed.inject(AccountStore), backend, setLanguage };
  }

  it('loads the account after sign-in and applies its language', async () => {
    const me = vi.fn().mockResolvedValue(account);
    const { store, backend, setLanguage } = setup({ me });
    backend.signIn();
    TestBed.tick();
    await vi.waitFor(() => {
      expect(store.account()).toEqual(account);
    });
    expect(store.ownsVenues()).toBe(true);
    expect(setLanguage).toHaveBeenCalledWith('en');
    expect(TestBed.inject(Roles).ownedVenueIds()).toEqual(account.ownedVenueIds);
  });

  it('records an error when loading fails', async () => {
    const { store, backend } = setup({ me: vi.fn().mockRejectedValue(new Error('offline')) });
    backend.signIn();
    await store.load();
    expect(store.error()).toBe('load-failed');
    const roles = TestBed.inject(Roles);
    expect(roles.known()).toBe(true);
    expect(roles.canManage()).toBe(false);
  });

  it('clears the account on sign-out', async () => {
    const { store, backend } = setup({ me: vi.fn().mockResolvedValue(account) });
    backend.signIn();
    await store.load();
    expect(store.account()).toEqual(account);
    void backend.signOut();
    TestBed.tick();
    expect(store.account()).toBeNull();
    expect(TestBed.inject(Roles).known()).toBe(false);
  });

  it('drops an account that arrives after sign-out', async () => {
    let answer: (value: typeof account) => void = () => undefined;
    const me = vi.fn(() => new Promise<typeof account>((resolve) => (answer = resolve)));
    const { store, backend, setLanguage } = setup({ me });
    backend.signIn();
    const loading = store.load();
    void backend.signOut();
    TestBed.tick();
    answer(account);
    await loading;
    expect(store.account()).toBeNull();
    expect(setLanguage).not.toHaveBeenCalled();
  });

  it('leaves the roles unknown when loading fails after sign-out', async () => {
    let fail: (error: Error) => void = () => undefined;
    const me = vi.fn(() => new Promise<typeof account>((_resolve, reject) => (fail = reject)));
    const { store, backend } = setup({ me });
    backend.signIn();
    const loading = store.load();
    void backend.signOut();
    TestBed.tick();
    fail(new Error('offline'));
    await loading;
    expect(store.error()).toBeNull();
    expect(TestBed.inject(Roles).known()).toBe(false);
  });

  it('keeps only the newest load when the account switches', async () => {
    const answers: ((value: typeof account) => void)[] = [];
    const me = vi.fn(() => new Promise<typeof account>((resolve) => answers.push(resolve)));
    const { store, backend } = setup({ me });
    backend.signIn();
    const newest = store.load();
    expect(me).toHaveBeenCalledTimes(2);
    expect(TestBed.inject(Roles).known()).toBe(false);
    answers[1]?.({ ...account, isAdmin: true });
    answers[0]?.(account);
    await newest;
    await new Promise((resolve) => setTimeout(resolve));
    expect(TestBed.inject(Roles).isAdmin()).toBe(true);
  });

  it('switches language at once and saves it when signed in', async () => {
    const updateMe = vi.fn().mockResolvedValue({ ...account, language: 'he' });
    const { store, backend, setLanguage } = setup({
      me: vi.fn().mockResolvedValue(account),
      updateMe,
    });
    backend.signIn();
    await store.load();
    await store.setLanguage('he');
    expect(setLanguage).toHaveBeenLastCalledWith('he');
    expect(updateMe).toHaveBeenCalledWith({ language: 'he' });
  });

  it('reports a failed save', async () => {
    const { store } = setup({ updateMe: vi.fn().mockRejectedValue(new Error('offline')) });
    await expect(store.update({ displayName: 'x' })).resolves.toBe(false);
    expect(store.error()).toBe('save-failed');
  });
});
