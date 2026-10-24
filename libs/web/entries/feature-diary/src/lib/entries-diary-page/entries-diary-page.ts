import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { DiaryStore } from '@menu/web/entries/data-access';
import { EntryCard } from '@menu/web/entries/ui';
import { I18n, injectTranslate, LocalizePipe } from '@menu/web/shared/util-i18n';
import { diaryI18n } from '../diary.i18n';

/**
 * The user's diary (`/diary`, from the profile): every entry, newest first,
 * private ones included. `/diary?venueId=` narrows it to one venue.
 */
@Component({
  selector: 'menu-entries-diary-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EntryCard,
    LocalizePipe,
  ],
  templateUrl: './entries-diary-page.html',
  styleUrl: './entries-diary-page.scss',
  providers: [DiaryStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntriesDiaryPage {
  protected readonly store = inject(DiaryStore);
  private readonly i18n = inject(I18n);
  protected readonly t = injectTranslate(diaryI18n);

  protected readonly backIcon = computed(() =>
    this.i18n.dir() === 'rtl' ? 'arrow_forward' : 'arrow_back',
  );

  /** The `venueId` query parameter: only the entries at that venue (from its page). */
  readonly venueId = input<string>();

  /** The venue's name when the diary is narrowed to one. */
  protected readonly venue = computed(() =>
    this.venueId() ? (this.store.entries()[0]?.item.venue ?? null) : null,
  );

  constructor() {
    this.store.load(() => {
      const venueId = this.venueId();
      return venueId ? { venueId } : {};
    });
  }

  protected retry(): void {
    this.store.reload();
  }
}
