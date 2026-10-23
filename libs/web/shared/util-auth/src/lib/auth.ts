import { computed, inject, Injectable, signal } from '@angular/core';
import { AUTH_BACKEND, type AuthUser } from './auth-backend';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

/**
 * Who is signed in, as signals. Starts `loading` until the provider has restored
 * (or not) the previous session. Sign-in itself happens in the sign-in page.
 */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly backend = inject(AUTH_BACKEND);
  private readonly current = signal<AuthUser | null | undefined>(undefined);
  private resolveReady: () => void = () => undefined;

  readonly user = computed(() => this.current() ?? null);
  readonly status = computed<AuthStatus>(() => {
    const user = this.current();
    return user === undefined ? 'loading' : user ? 'signed-in' : 'signed-out';
  });
  readonly signedIn = computed(() => this.status() === 'signed-in');

  /** Resolves once the previous session has been restored or found missing. */
  readonly ready = new Promise<void>((resolve) => {
    this.resolveReady = resolve;
  });

  constructor() {
    this.backend
      .watchUser((user) => {
        this.current.set(user);
        this.resolveReady();
      })
      .catch(() => {
        // Sign-in is unavailable (no config, offline): carry on signed out.
        this.current.set(null);
        this.resolveReady();
      });
  }

  /**
   * A fresh ID token for the API, or null when signed out. Waits for the session
   * to be restored, so calls made at startup carry the token too.
   */
  async idToken(): Promise<string | null> {
    await this.ready;
    return this.signedIn() ? this.backend.idToken() : null;
  }

  signInWithGoogle(): Promise<void> {
    return this.backend.signInWithGoogle();
  }

  sendPhoneCode(phoneNumber: string, container: HTMLElement): Promise<void> {
    return this.backend.sendPhoneCode(phoneNumber, container);
  }

  confirmPhoneCode(code: string): Promise<void> {
    return this.backend.confirmPhoneCode(code);
  }

  signOut(): Promise<void> {
    return this.backend.signOut();
  }
}
