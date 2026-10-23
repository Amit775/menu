import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { Auth } from './auth';
import { AUTH_BACKEND } from './auth-backend';
import { authInterceptor } from './auth.interceptor';
import { FakeAuthBackend } from './testing';

describe('authInterceptor', () => {
  function setup(signedIn: boolean): { http: HttpClient; controller: HttpTestingController } {
    const backend = new FakeAuthBackend(
      signedIn ? { uid: 'u1', displayName: null, phoneNumber: null } : null,
    );
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AUTH_BACKEND, useValue: backend },
      ],
    });
    TestBed.inject(Auth);
    return { http: TestBed.inject(HttpClient), controller: TestBed.inject(HttpTestingController) };
  }

  async function flushMicrotasks(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve));
  }

  it('sends the ID token to the API', async () => {
    const { http, controller } = setup(true);
    const response = firstValueFrom(http.get('/api/accounts/me'));
    await flushMicrotasks();
    const request = controller.expectOne('/api/accounts/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-token');
    request.flush({});
    await response;
  });

  it('sends no token when signed out', async () => {
    const { http, controller } = setup(false);
    const response = firstValueFrom(http.get('/api/tags'));
    await flushMicrotasks();
    const request = controller.expectOne('/api/tags');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush([]);
    await response;
  });

  it('never sends the token elsewhere', () => {
    const { http, controller } = setup(true);
    void firstValueFrom(http.get('/__/firebase/init.json'));
    const request = controller.expectOne('/__/firebase/init.json');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
