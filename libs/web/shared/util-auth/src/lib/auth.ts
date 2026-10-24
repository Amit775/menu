import { computed, inject, Service, signal } from '@angular/core';
import { distinctUntilChanged, type Observable, ReplaySubject } from 'rxjs';
import { AUTH_BACKEND, type AuthUser } from './auth-backend';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

@Service()
export class Auth {
  private readonly backend = inject(AUTH_BACKEND);
  private readonly current = signal<AuthUser | null | undefined>(undefined);
  private readonly users = new ReplaySubject<AuthUser | null>(1);
  private resolveReady: () => void = () => undefined;

  readonly user = computed(() => this.current() ?? null);
  readonly status = computed<AuthStatus>(() => {
    const user = this.current();
    return user === undefined ? 'loading' : user ? 'signed-in' : 'signed-out';
  });
  readonly signedIn = computed(() => this.status() === 'signed-in');

  readonly userChanges: Observable<AuthUser | null> = this.users.pipe(
    distinctUntilChanged((previous, next) => previous?.uid === next?.uid),
  );

  readonly ready = new Promise<void>((resolve) => {
    this.resolveReady = resolve;
  });

  constructor() {
    this.backend
      .watchUser((user) => {
        this.restored(user);
      })
      .catch(() => {
        // Sign-in is unavailable (no config, offline): carry on signed out.
        this.restored(null);
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

  private restored(user: AuthUser | null): void {
    this.current.set(user);
    this.users.next(user);
    this.resolveReady();
  }
}
