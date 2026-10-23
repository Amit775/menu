import { TestBed } from '@angular/core/testing';
import { Auth } from './auth';
import { AUTH_BACKEND, type AuthBackend } from './auth-backend';
import { FakeAuthBackend } from './testing';

describe('Auth', () => {
  function setup(backend: AuthBackend): Auth {
    TestBed.configureTestingModule({ providers: [{ provide: AUTH_BACKEND, useValue: backend }] });
    return TestBed.inject(Auth);
  }

  it('is signed out when no session is restored', async () => {
    const auth = setup(new FakeAuthBackend());
    await auth.ready;
    expect(auth.status()).toBe('signed-out');
    await expect(auth.idToken()).resolves.toBeNull();
  });

  it('follows a sign-in and gives a token for the API', async () => {
    const backend = new FakeAuthBackend();
    const auth = setup(backend);
    await auth.signInWithGoogle();
    expect(auth.user()).toMatchObject({ uid: 'u1' });
    await expect(auth.idToken()).resolves.toBe('test-token');
  });

  it('waits for the session to be restored before giving a token', async () => {
    const backend = new FakeAuthBackend({ uid: 'u1', displayName: null, phoneNumber: null });
    let restore: () => void = () => undefined;
    const watchUser = backend.watchUser.bind(backend);
    backend.watchUser = (callback) =>
      new Promise((resolve) => {
        restore = () => {
          void watchUser(callback).then(resolve);
        };
      });
    const auth = setup(backend);
    expect(auth.status()).toBe('loading');
    const token = auth.idToken();
    restore();
    await expect(token).resolves.toBe('test-token');
  });

  it('carries on signed out when sign-in cannot load', async () => {
    const broken = new FakeAuthBackend();
    broken.watchUser = () => Promise.reject(new Error('no config'));
    const auth = setup(broken);
    await auth.ready;
    expect(auth.status()).toBe('signed-out');
  });
});
