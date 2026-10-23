import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AUTH_BACKEND, FakeAuthBackend } from '@menu/web/shared/util-auth';
import { SignInPage } from './sign-in-page';

describe('SignInPage', () => {
  async function setup(returnUrl?: string) {
    const backend = new FakeAuthBackend();
    await TestBed.configureTestingModule({
      imports: [SignInPage],
      providers: [provideRouter([]), { provide: AUTH_BACKEND, useValue: backend }],
    }).compileComponents();
    const fixture = TestBed.createComponent(SignInPage);
    if (returnUrl) {
      fixture.componentRef.setInput('returnUrl', returnUrl);
    }
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
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
});
