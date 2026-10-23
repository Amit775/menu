import { HttpClient } from '@angular/common/http';
import { inject, Injectable, InjectionToken } from '@angular/core';
import type { FirebaseOptions } from 'firebase/app';
import type { Auth as FirebaseAuth, ConfirmationResult } from 'firebase/auth';
import { firstValueFrom } from 'rxjs';

/** The signed-in user as the app needs it. */
export interface AuthUser {
  uid: string;
  displayName: string | null;
  phoneNumber: string | null;
}

/** The sign-in provider behind `Auth`. Firebase in the app; a fake in tests. */
export interface AuthBackend {
  /** Calls back now and on every sign-in, sign-out and token refresh. */
  watchUser(callback: (user: AuthUser | null) => void): Promise<void>;
  idToken(): Promise<string | null>;
  signInWithGoogle(): Promise<void>;
  /** Sends an SMS code; `container` hosts the invisible reCAPTCHA. */
  sendPhoneCode(phoneNumber: string, container: HTMLElement): Promise<void>;
  confirmPhoneCode(code: string): Promise<void>;
  signOut(): Promise<void>;
}

/**
 * Firebase Authentication, loaded on first use so it stays out of the initial
 * bundle. The web config comes from Firebase Hosting's reserved
 * `/__/firebase/init.json` (proxied to the live site in development), so no
 * keys live in the repository.
 */
@Injectable({ providedIn: 'root' })
export class FirebaseAuthBackend implements AuthBackend {
  private readonly http = inject(HttpClient);
  private auth: Promise<FirebaseAuth> | undefined;
  private confirmation: ConfirmationResult | null = null;

  async watchUser(callback: (user: AuthUser | null) => void): Promise<void> {
    const auth = await this.load();
    const { onIdTokenChanged } = await import('firebase/auth');
    onIdTokenChanged(auth, (user) => {
      callback(
        user
          ? { uid: user.uid, displayName: user.displayName, phoneNumber: user.phoneNumber }
          : null,
      );
    });
  }

  async idToken(): Promise<string | null> {
    const user = (await this.load()).currentUser;
    return user ? user.getIdToken() : null;
  }

  async signInWithGoogle(): Promise<void> {
    const auth = await this.load();
    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
    await signInWithPopup(auth, new GoogleAuthProvider());
  }

  async sendPhoneCode(phoneNumber: string, container: HTMLElement): Promise<void> {
    const auth = await this.load();
    const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
    const verifier = new RecaptchaVerifier(auth, container, { size: 'invisible' });
    this.confirmation = await signInWithPhoneNumber(auth, phoneNumber, verifier);
  }

  async confirmPhoneCode(code: string): Promise<void> {
    if (!this.confirmation) {
      throw new Error('Send a code first.');
    }
    await this.confirmation.confirm(code);
    this.confirmation = null;
  }

  async signOut(): Promise<void> {
    const auth = await this.load();
    const { signOut } = await import('firebase/auth');
    await signOut(auth);
  }

  private load(): Promise<FirebaseAuth> {
    this.auth ??= (async () => {
      const config = await firstValueFrom(this.http.get<FirebaseOptions>('/__/firebase/init.json'));
      const { initializeApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth(initializeApp(config));
      // SMS codes in Hebrew, the app's default language.
      auth.languageCode = 'he';
      return auth;
    })();
    return this.auth;
  }
}

export const AUTH_BACKEND = new InjectionToken<AuthBackend>('AUTH_BACKEND', {
  providedIn: 'root',
  factory: () => inject(FirebaseAuthBackend),
});
