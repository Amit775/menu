import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FirebaseAuthBackend } from './auth-backend';

const firebase = vi.hoisted(() => {
  const auth = { languageCode: '', currentUser: null as { getIdToken(): Promise<string> } | null };
  const verifiers: { clear: ReturnType<typeof vi.fn> }[] = [];
  return {
    auth,
    verifiers,
    initializeApp: vi.fn((config: unknown) => ({ config })),
    getApps: vi.fn((): unknown[] => []),
    getAuth: vi.fn(() => auth),
    signInWithPhoneNumber: vi.fn(),
    RecaptchaVerifier: vi.fn(function (this: { clear: ReturnType<typeof vi.fn> }) {
      this.clear = vi.fn();
      verifiers.push(this);
    }),
  };
});

vi.mock('firebase/app', () => ({
  initializeApp: firebase.initializeApp,
  getApps: firebase.getApps,
}));
vi.mock('firebase/auth', () => ({
  getAuth: firebase.getAuth,
  signInWithPhoneNumber: firebase.signInWithPhoneNumber,
  RecaptchaVerifier: firebase.RecaptchaVerifier,
}));

describe('FirebaseAuthBackend', () => {
  const config = { apiKey: 'k', authDomain: 'menu.example', projectId: 'menu', appId: 'a' };
  let backend: FirebaseAuthBackend;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.clearAllMocks();
    firebase.verifiers.length = 0;
    firebase.auth.currentUser = null;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(FirebaseAuthBackend);
    http = TestBed.inject(HttpTestingController);
  });

  async function serveConfig(body: object = config): Promise<void> {
    await vi.waitFor(() => {
      http.expectOne('/__/firebase/init.json').flush(body);
    });
  }

  it('starts Firebase with the Hosting web config, in Hebrew', async () => {
    const token = backend.idToken();
    await serveConfig();
    await expect(token).resolves.toBeNull();
    expect(firebase.initializeApp).toHaveBeenCalledWith(config);
    expect(firebase.auth.languageCode).toBe('he');
  });

  it('gives the signed-in user a fresh token', async () => {
    firebase.auth.currentUser = { getIdToken: () => Promise.resolve('id-token') };
    const token = backend.idToken();
    await serveConfig();
    await expect(token).resolves.toBe('id-token');
  });

  it('rejects a config without the sign-in keys', async () => {
    const token = backend.idToken();
    await serveConfig({ projectId: 'menu' });
    await expect(token).rejects.toThrow('register a web app');
  });

  it('tries to load again after a failure', async () => {
    const first = backend.idToken();
    await vi.waitFor(() => {
      http.expectOne('/__/firebase/init.json').error(new ProgressEvent('offline'));
    });
    await expect(first).rejects.toBeDefined();
    const second = backend.idToken();
    await serveConfig();
    await expect(second).resolves.toBeNull();
  });

  it('reuses one reCAPTCHA for a second code on the same page', async () => {
    const container = {} as HTMLElement;
    firebase.signInWithPhoneNumber
      .mockRejectedValueOnce({ code: 'auth/too-many-requests' })
      .mockResolvedValueOnce({ confirm: vi.fn() });
    const first = backend.sendPhoneCode('+972501234567', container);
    await serveConfig();
    await expect(first).rejects.toEqual({ code: 'auth/too-many-requests' });
    await backend.sendPhoneCode('+972501234567', container);
    expect(firebase.RecaptchaVerifier).toHaveBeenCalledTimes(1);
  });

  it('replaces the reCAPTCHA when the page is new', async () => {
    firebase.signInWithPhoneNumber.mockResolvedValue({ confirm: vi.fn() });
    const first = backend.sendPhoneCode('+972501234567', {} as HTMLElement);
    await serveConfig();
    await first;
    await backend.sendPhoneCode('+972501234567', {} as HTMLElement);
    expect(firebase.RecaptchaVerifier).toHaveBeenCalledTimes(2);
    expect(firebase.verifiers[0]?.clear).toHaveBeenCalled();
  });

  it('refuses a code before one was sent', async () => {
    await expect(backend.confirmPhoneCode('123456')).rejects.toThrow('Send a code first.');
  });
});
