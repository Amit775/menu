import { HttpClient } from '@angular/common/http';
import { inject, Service, InjectionToken } from '@angular/core';
import type { FirebaseOptions } from 'firebase/app';
import type { Auth as FirebaseAuth, ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
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
@Service()
export class FirebaseAuthBackend implements AuthBackend {
  private readonly http = inject(HttpClient);
  private auth: Promise<FirebaseAuth> | undefined;
  private confirmation: ConfirmationResult | null = null;
  /** One invisible reCAPTCHA per container: rendering twice into an element throws. */
  private recaptcha: { container: HTMLElement; verifier: RecaptchaVerifier } | null = null;

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
    if (this.recaptcha?.container !== container) {
      this.recaptcha?.verifier.clear();
      this.recaptcha = {
        container,
        verifier: new RecaptchaVerifier(auth, container, { size: 'invisible' }),
      };
    }
    // Firebase resets the verifier after each attempt, so a retry can reuse it.
    this.confirmation = await signInWithPhoneNumber(auth, phoneNumber, this.recaptcha.verifier);
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

  /** Loads once; a failure (offline, no web app registered) is retried on the next call. */
  private load(): Promise<FirebaseAuth> {
    this.auth ??= (async () => {
      const config = firebaseConfig(
        await firstValueFrom(this.http.get<unknown>('/__/firebase/init.json')),
      );
      const { getApps, initializeApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth(getApps()[0] ?? initializeApp(config));
      // SMS codes in Hebrew, the app's default language.
      auth.languageCode = 'he';
      return auth;
    })().catch((error: unknown) => {
      this.auth = undefined;
      throw error;
    });
    return this.auth;
  }
}

/**
 * The parts of Hosting's web config that sign-in needs. A plain check, not Zod:
 * this file sits next to the initial bundle.
 */
function firebaseConfig(value: unknown): FirebaseOptions {
  const config = value as Record<string, unknown> | null;
  const required = ['apiKey', 'authDomain', 'projectId', 'appId'];
  if (!config || required.some((key) => typeof config[key] !== 'string')) {
    throw new Error('Firebase web config is missing: register a web app in the Firebase console.');
  }
  return config;
}

export const AUTH_BACKEND = new InjectionToken<AuthBackend>('AUTH_BACKEND', {
  providedIn: 'root',
  factory: () => inject(FirebaseAuthBackend),
});
