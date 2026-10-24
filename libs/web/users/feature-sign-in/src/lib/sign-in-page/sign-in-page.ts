import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  type ElementRef,
  inject,
  type OnInit,
  input,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { Auth } from '@menu/web/shared/util-auth';
import { injectMessages } from '@menu/web/shared/util-i18n';
import { safeReturnUrl, toE164 } from '../phone-number';
import { signInMessages } from '../sign-in.messages';

type SignInError = 'invalid-phone' | 'invalid-code' | 'too-many' | 'failed';

/** Firebase's answer, when it names the problem; otherwise the step's own error. */
function signInError(error: unknown, fallback: SignInError): SignInError {
  switch ((error as { code?: unknown } | null)?.code) {
    case 'auth/invalid-phone-number':
      return 'invalid-phone';
    case 'auth/invalid-verification-code':
      return 'invalid-code';
    case 'auth/too-many-requests':
    case 'auth/quota-exceeded':
      return 'too-many';
    default:
      return fallback;
  }
}

/** Sign-in with Google or a phone number (Firebase Authentication). */

const required: ValidatorFn = (control) => Validators.required(control);
@Component({
  selector: 'menu-sign-in-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './sign-in-page.html',
  styleUrl: './sign-in-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignInPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  protected readonly t = injectMessages(signInMessages);

  /** `?returnUrl=`: where to go once signed in. */
  readonly returnUrl = input<string>();

  protected readonly step = signal<'phone' | 'code'>('phone');
  protected readonly busy = signal(false);
  protected readonly error = signal<SignInError | null>(null);
  protected readonly errorText = computed(() => {
    const messages = this.t();
    switch (this.error()) {
      case 'invalid-phone':
        return messages.errorInvalidPhone;
      case 'invalid-code':
        return messages.errorInvalidCode;
      case 'too-many':
        return messages.errorTooMany;
      case 'failed':
        return messages.errorFailed;
      default:
        return null;
    }
  });

  protected readonly phone = new FormControl('', {
    nonNullable: true,
    validators: required,
  });
  protected readonly code = new FormControl('', {
    nonNullable: true,
    validators: [required, Validators.pattern(/^\d{6}$/)],
  });
  protected readonly phoneForm = new FormGroup({ phone: this.phone });
  protected readonly codeForm = new FormGroup({ code: this.code });
  private readonly recaptcha = viewChild.required<ElementRef<HTMLElement>>('recaptcha');

  ngOnInit(): void {
    this.auth.userChanges
      .pipe(filter(Boolean), take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => void this.router.navigateByUrl(safeReturnUrl(this.returnUrl())));
  }

  protected async google(): Promise<void> {
    await this.attempt('failed', () => this.auth.signInWithGoogle());
  }

  protected async sendCode(): Promise<void> {
    const phoneNumber = toE164(this.phone.value);
    if (!phoneNumber) {
      this.error.set('invalid-phone');
      return;
    }
    const sent = await this.attempt('failed', () =>
      this.auth.sendPhoneCode(phoneNumber, this.recaptcha().nativeElement),
    );
    if (sent) {
      this.step.set('code');
    }
  }

  protected async confirm(): Promise<void> {
    await this.attempt('invalid-code', () => this.auth.confirmPhoneCode(this.code.value));
  }

  protected changePhone(): void {
    this.code.reset();
    this.error.set(null);
    this.step.set('phone');
  }

  /** Runs one sign-in step and reports how it failed. */
  private async attempt(onError: SignInError, action: () => Promise<void>): Promise<boolean> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await action();
      return true;
    } catch (error) {
      this.error.set(signInError(error, onError));
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
