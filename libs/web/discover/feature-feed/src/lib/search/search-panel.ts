import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { type Tag } from '@menu/shared/contracts';
import { FeedStore, SearchStore } from '@menu/web/discover/data-access';
import { ItemRow } from '@menu/web/discover/ui';
import { injectMessages, LocalizePipe } from '@menu/web/shared/util-i18n';
import { debounceTime } from 'rxjs';
import { feedMessages } from '../feed.messages';

/** Search across items, venues and tags (opened as a full-screen dialog); picking a tag filters the feed by it. */
@Component({
  selector: 'menu-search-panel',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ItemRow,
    LocalizePipe,
  ],
  templateUrl: './search-panel.html',
  styleUrl: './search-panel.scss',
  providers: [SearchStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPanel {
  protected readonly search = inject(SearchStore);
  private readonly feed = inject(FeedStore);
  protected readonly t = injectMessages(feedMessages);

  private readonly dialog = inject(MatDialogRef);

  protected readonly text = new FormControl('', { nonNullable: true });

  constructor() {
    this.text.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((text) => void this.search.search(text));
  }

  protected filterBy(tag: Tag): void {
    void this.feed.setFilters({ tagIds: [tag.id] });
    this.dialog.close();
  }

  protected close(): void {
    this.dialog.close();
  }
}
