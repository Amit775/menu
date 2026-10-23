import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AUTH_BACKEND, FakeAuthBackend } from '@menu/web/shared/util-auth';
import { provideAccountAtStartup } from './account-at-startup';

describe('provideAccountAtStartup', () => {
  it('loads a signed-in account without opening the profile', async () => {
    // Imported the way the app does, lazily.
    const { AccountApiClient } = await import('@menu/web/users/data-access');
    const me = vi.fn().mockResolvedValue({
      id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
      displayName: 'Noa',
      language: 'en',
      isAdmin: false,
      ownedVenueIds: [],
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    TestBed.configureTestingModule({
      providers: [
        provideAccountAtStartup(),
        { provide: AccountApiClient, useValue: { me } },
        {
          provide: AUTH_BACKEND,
          useValue: new FakeAuthBackend({ uid: 'u1', displayName: null, phoneNumber: null }),
        },
      ],
    });
    await TestBed.inject(ApplicationInitStatus).donePromise;
    await vi.waitFor(() => {
      TestBed.tick();
      expect(me).toHaveBeenCalled();
    });
  });
});
