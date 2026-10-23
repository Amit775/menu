import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { DiaryStore } from '@menu/web/entries/data-access';
import { EntryCard } from '@menu/web/entries/ui';
import { I18n, injectMessages, LocalizePipe } from '@menu/web/shared/util-i18n';
import { diaryMessages } from '../diary.messages';

/** The user's diary (`/diary`, from the profile): every entry, newest first, private ones included. */
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
  protected readonly t = injectMessages(diaryMessages);

  protected readonly backIcon = computed(() =>
    this.i18n.dir() === 'rtl' ? 'arrow_forward' : 'arrow_back',
  );

  constructor() {
    void this.store.load();
  }

  protected retry(): void {
    void this.store.load();
  }
}
