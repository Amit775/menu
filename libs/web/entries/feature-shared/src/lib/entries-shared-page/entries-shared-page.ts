import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { SharedEntryStore } from '@menu/web/entries/data-access';
import { Auth } from '@menu/web/shared/util-auth';
import { I18n, injectMessages, LocalizePipe, ShekelsPipe } from '@menu/web/shared/util-i18n';
import { sharedMessages } from '../shared.messages';

/**
 * J5: what a share link (`/e/:token`) shows to anyone: the entry with its
 * author's display name, the way to the item's public page, and one sign-up
 * prompt for visitors. A private or removed entry says so and nothing more.
 */
@Component({
  selector: 'menu-entries-shared-page',
  imports: [RouterLink, MatButtonModule, MatProgressSpinnerModule, LocalizePipe, ShekelsPipe],
  templateUrl: './entries-shared-page.html',
  styleUrl: './entries-shared-page.scss',
  providers: [SharedEntryStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntriesSharedPage {
  protected readonly store = inject(SharedEntryStore);
  protected readonly auth = inject(Auth);
  private readonly i18n = inject(I18n);
  protected readonly t = injectMessages(sharedMessages);

  /** The `:token` route parameter. */
  readonly token = input.required<string>();

  constructor() {
    effect(() => {
      const token = this.token();
      untracked(() => void this.store.load(token));
    });
  }

  protected formatDate(iso: string): string {
    return new Intl.DateTimeFormat(this.i18n.language(), { dateStyle: 'medium' }).format(
      new Date(iso),
    );
  }

  protected retry(): void {
    void this.store.load(this.token());
  }
}
