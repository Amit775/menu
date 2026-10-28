import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { form, FormField, maxLength, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ContributorApplicationStore } from '@menu/web/users/data-access';
import { injectTranslate, RelativeDatePipe } from '@menu/web/shared/util-i18n';
import { profileI18n } from '../profile.i18n';

type Stage = 'loading' | 'error' | 'pending' | 'waiting' | 'open' | 'closed';

@Component({
  selector: 'menu-contributor-application',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule, RelativeDatePipe],
  templateUrl: './contributor-application.html',
  styleUrl: './contributor-application.scss',
  providers: [ContributorApplicationStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContributorApplication {
  protected readonly store = inject(ContributorApplicationStore);
  protected readonly t = injectTranslate(profileI18n);

  private readonly note = signal('');
  protected readonly noteField = form(this.note, (path) => {
    validate(path, ({ value }) => (value().trim() === '' ? { kind: 'required' } : null));
    maxLength(path, 500);
  });
  protected readonly sending = signal(false);
  protected readonly failed = signal(false);

  protected readonly stage = computed<Stage>(() => {
    const status = this.store.status();
    if (status !== 'loaded') {
      return status === 'loading' ? 'loading' : 'error';
    }
    if (this.store.application()?.status === 'pending') {
      return 'pending';
    }
    const from = this.store.canApplyFrom();
    if (from === null) {
      return 'closed';
    }
    return new Date(from).getTime() > Date.now() ? 'waiting' : 'open';
  });

  protected async apply(): Promise<void> {
    if (this.noteField().invalid() || this.sending()) {
      this.noteField().markAsTouched();
      return;
    }
    this.sending.set(true);
    this.failed.set(false);
    try {
      await this.store.apply(this.note().trim());
    } catch {
      this.failed.set(true);
    } finally {
      this.sending.set(false);
    }
  }
}
