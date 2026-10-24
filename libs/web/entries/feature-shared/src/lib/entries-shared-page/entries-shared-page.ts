import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { SharedEntryStore } from '@menu/web/entries/data-access';
import { Auth } from '@menu/web/shared/util-auth';
import { I18n, injectTranslate, LocalizePipe, ShekelsPipe } from '@menu/web/shared/util-i18n';
import { sharedI18n } from '../shared.i18n';

/**
 * J5: what a share link (`/e/:token`) shows to anyone: the entry with its
 * author's display name, the way to the item's public page, and one sign-up
 * prompt for visitors. A private or removed entry says so and nothing more.
 */
@Component({
  selector: 'menu-entries-shared-page',
  imports: [
    NgOptimizedImage,
    RouterLink,
    MatButtonModule,
    MatProgressSpinnerModule,
    LocalizePipe,
    ShekelsPipe,
  ],
  templateUrl: './entries-shared-page.html',
  styleUrl: './entries-shared-page.scss',
  providers: [SharedEntryStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntriesSharedPage {
  protected readonly store = inject(SharedEntryStore);
  protected readonly auth = inject(Auth);
  private readonly i18n = inject(I18n);
  protected readonly t = injectTranslate(sharedI18n);

  /** The `:token` route parameter. */
  readonly token = input.required<string>();

  constructor() {
    this.store.load(this.token);
  }

  /** When the entry was eaten, in the reader's language. */
  protected readonly eatenOn = computed(() => {
    const view = this.store.view();
    return view?.status === 'visible'
      ? new Intl.DateTimeFormat(this.i18n.language(), { dateStyle: 'medium' }).format(
          new Date(view.entry.eatenAt),
        )
      : '';
  });

  protected retry(): void {
    this.store.reload();
  }
}
