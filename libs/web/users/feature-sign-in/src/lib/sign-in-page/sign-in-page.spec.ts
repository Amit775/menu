import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AUTH_BACKEND, FakeAuthBackend } from '@menu/web/shared/util-auth';
import { SignInPage } from './sign-in-page';

describe('SignInPage', () => {
  async function setup(returnUrl?: string, backend = new FakeAuthBackend()) {
    await TestBed.configureTestingModule({
      imports: [SignInPage],
      providers: [provideRouter([]), { provide: AUTH_BACKEND, useValue: backend }],
    }).compileComponents();
    const fixture = TestBed.createComponent(SignInPage);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    if (returnUrl) {
      fixture.componentRef.setInput('returnUrl', returnUrl);
    }
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const button = (text: string): HTMLButtonElement => {
      const found = [...element.querySelectorAll('button')].find((b) =>
        b.textContent.includes(text),
      );
      if (!found) {
        throw new Error(`No button "${text}"`);
      }
      return found;
    };
    const type = (selector: string, value: string): void => {
      const input = element.querySelector<HTMLInputElement>(selector);
      if (input) {
        input.value = value;
        input.dispatchEvent(new Event('input'));
      }
    };
    return { fixture, element, backend, navigate, button, type };
  }

  it('signs in with Google and goes back where the user came from', async () => {
    const { fixture, backend, navigate, button } = await setup('/items/1');
    button('כניסה עם Google').click();
    await fixture.whenStable();
    expect(backend.calls()).toEqual(['google']);
    expect(navigate).toHaveBeenCalledWith('/items/1');
  });

  it('sends a code to an Israeli number, then signs in with it', async () => {
    const { fixture, element, backend, navigate, button, type } = await setup();
    type('input[type=tel]', '050-123 4567');
    fixture.detectChanges();
    button('שליחת קוד').click();
    await fixture.whenStable();
    type('input[inputmode=numeric]', '123456');
    fixture.detectChanges();
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(backend.calls()).toEqual(['sms:+972501234567', 'code:123456']);
    expect(navigate).toHaveBeenCalledWith('/profile');
  });

  it('explains a number that is not a phone number', async () => {
    const { fixture, element, backend, button, type } = await setup();
    type('input[type=tel]', 'abc');
    fixture.detectChanges();
    button('שליחת קוד').click();
    await fixture.whenStable();
    expect(element.querySelector('[role=alert]')?.textContent).toContain('המספר לא נראה תקין');
    expect(backend.calls()).toEqual([]);
  });

  it('never follows a return address off the app', async () => {
    const { fixture, navigate, button } = await setup('//evil.example');
    button('כניסה עם Google').click();
    await fixture.whenStable();
    expect(navigate).toHaveBeenCalledWith('/profile');
  });

  it('sends a visitor who is already signed in on their way', async () => {
    const { navigate } = await setup(
      '/items/1',
      new FakeAuthBackend({ uid: 'u1', displayName: null, phoneNumber: null }),
    );
    expect(navigate).toHaveBeenCalledWith('/items/1');
  });

  it('says so when Google sign-in fails', async () => {
    const backend = new FakeAuthBackend();
    backend.signInWithGoogle = () => Promise.reject(new Error('popup closed'));
    const { fixture, element, navigate, button } = await setup(undefined, backend);
    button('כניסה עם Google').click();
    await fixture.whenStable();
    expect(element.querySelector('[role=alert]')?.textContent).toContain('הכניסה לא הצליחה');
    expect(navigate).not.toHaveBeenCalled();
  });

  async function sendCode(backend: FakeAuthBackend) {
    const page = await setup(undefined, backend);
    page.type('input[type=tel]', '0501234567');
    page.fixture.detectChanges();
    page.button('שליחת קוד').click();
    await page.fixture.whenStable();
    return page;
  }

  it('explains a wrong code and stays on the code step', async () => {
    const backend = new FakeAuthBackend();
    backend.confirmPhoneCode = () =>
      Promise.reject(
        Object.assign(new Error('firebase'), { code: 'auth/invalid-verification-code' }),
      );
    const { fixture, element, type } = await sendCode(backend);
    type('input[inputmode=numeric]', '000000');
    fixture.detectChanges();
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    expect(element.querySelector('[role=alert]')?.textContent).toContain('הקוד לא נכון');
    expect(element.querySelector('input[inputmode=numeric]')).not.toBeNull();
  });

  it('tells apart too many tries from a bad number', async () => {
    const backend = new FakeAuthBackend();
    backend.sendPhoneCode = () =>
      Promise.reject(Object.assign(new Error('firebase'), { code: 'auth/too-many-requests' }));
    const { element } = await sendCode(backend);
    expect(element.querySelector('[role=alert]')?.textContent).toContain('יותר מדי ניסיונות');
  });
});
