import { signal } from '@angular/core';
import { type AuthBackend, type AuthUser } from './auth-backend';

/** An in-memory `AuthBackend` for tests: `signIn()` and `signOut()` drive it. */
export class FakeAuthBackend implements AuthBackend {
  private callback: ((user: AuthUser | null) => void) | undefined;
  readonly calls = signal<string[]>([]);
  token = 'test-token';

  constructor(private user: AuthUser | null = null) {}

  watchUser(callback: (user: AuthUser | null) => void): Promise<void> {
    this.callback = callback;
    callback(this.user);
    return Promise.resolve();
  }

  idToken(): Promise<string | null> {
    return Promise.resolve(this.user ? this.token : null);
  }

  signIn(user: AuthUser = { uid: 'u1', displayName: 'נועה', phoneNumber: null }): void {
    this.user = user;
    this.callback?.(user);
  }

  signInWithGoogle(): Promise<void> {
    this.record('google');
    this.signIn();
    return Promise.resolve();
  }

  sendPhoneCode(phoneNumber: string): Promise<void> {
    this.record(`sms:${phoneNumber}`);
    return Promise.resolve();
  }

  confirmPhoneCode(code: string): Promise<void> {
    this.record(`code:${code}`);
    this.signIn({ uid: 'u2', displayName: null, phoneNumber: '+972501234567' });
    return Promise.resolve();
  }

  signOut(): Promise<void> {
    this.record('sign-out');
    this.user = null;
    this.callback?.(null);
    return Promise.resolve();
  }

  private record(call: string): void {
    this.calls.update((calls) => [...calls, call]);
  }
}
