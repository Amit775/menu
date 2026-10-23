import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { type Language } from '@menu/shared/contracts';
import { AccountStore } from '@menu/web/users/data-access';
import { Auth } from '@menu/web/shared/util-auth';
import { I18n, injectMessages } from '@menu/web/shared/util-i18n';
import { profileMessages } from '../profile.messages';

/** The profile tab: sign-in prompt, or the account's name, language and sign-out. The diary joins later. */

const required: ValidatorFn = (control) => Validators.required(control);
@Component({
  selector: 'menu-profile-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage {
  protected readonly auth = inject(Auth);
  protected readonly store = inject(AccountStore);
  protected readonly i18n = inject(I18n);
  protected readonly t = injectMessages(profileMessages);

  protected readonly name = new FormControl('', {
    nonNullable: true,
    validators: [required, Validators.maxLength(60)],
  });
  protected readonly nameForm = new FormGroup({ name: this.name });
  protected readonly saved = signal(false);

  constructor() {
    effect(() => {
      const displayName = this.store.account()?.displayName;
      if (displayName !== undefined) {
        untracked(() => {
          this.name.setValue(displayName);
        });
      }
    });
  }

  protected async saveName(): Promise<void> {
    this.saved.set(await this.store.update({ displayName: this.name.value.trim() }));
  }

  protected setLanguage(language: Language): void {
    void this.store.setLanguage(language);
  }

  protected signOut(): void {
    void this.auth.signOut();
  }
}
