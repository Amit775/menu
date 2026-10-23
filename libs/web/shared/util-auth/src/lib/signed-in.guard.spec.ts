import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, type UrlTree } from '@angular/router';
import { AUTH_BACKEND } from './auth-backend';
import { signedInGuard } from './signed-in.guard';
import { FakeAuthBackend } from './testing';

describe('signedInGuard', () => {
  function run(backend: FakeAuthBackend): Promise<unknown> {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AUTH_BACKEND, useValue: backend }],
    });
    return TestBed.runInInjectionContext(() =>
      signedInGuard({} as never, { url: '/profile/diary' } as never),
    ) as Promise<unknown>;
  }

  it('lets a signed-in user through', async () => {
    await expect(
      run(new FakeAuthBackend({ uid: 'u1', displayName: null, phoneNumber: null })),
    ).resolves.toBe(true);
  });

  it('sends a visitor to sign-in with the way back', async () => {
    const result = (await run(new FakeAuthBackend())) as UrlTree;
    expect(TestBed.inject(Router).serializeUrl(result)).toBe(
      '/sign-in?returnUrl=%2Fprofile%2Fdiary',
    );
  });
});
