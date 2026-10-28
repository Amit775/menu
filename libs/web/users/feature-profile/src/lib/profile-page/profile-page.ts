import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { form, FormField, maxLength, required, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { type Language } from '@menu/shared/contracts';
import { AccountStore } from '@menu/web/users/data-access';
import { Auth } from '@menu/web/shared/util-auth';
import { I18n, injectTranslate } from '@menu/web/shared/util-i18n';
import { ContributorApplication } from '../contributor-application/contributor-application';
import { profileI18n } from '../profile.i18n';

@Component({
  selector: 'menu-profile-page',
  imports: [
    ContributorApplication,
    FormField,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
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
  protected readonly t = injectTranslate(profileI18n);

  private readonly name = linkedSignal(() => this.store.account()?.displayName ?? '');
  protected readonly nameField = form(this.name, (path) => {
    required(path);
    validate(path, ({ value }) => (value().trim() === '' ? { kind: 'required' } : null));
    maxLength(path, 60);
  });
  protected readonly saved = signal(false);

  protected async saveName(): Promise<void> {
    this.saved.set(await this.store.update({ displayName: this.name().trim() }));
  }

  protected setLanguage(language: Language): void {
    void this.store.setLanguage(language);
  }

  protected signOut(): void {
    void this.auth.signOut();
  }
}
