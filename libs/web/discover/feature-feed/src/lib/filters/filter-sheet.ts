import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { DEFAULT_FILTERS, FeedStore, type FeedSort } from '@menu/web/discover/data-access';
import { injectMessages, LocalizePipe } from '@menu/web/shared/util-i18n';
import { feedMessages } from '../feed.messages';

export const RADIUS_OPTIONS = [1, 2, 5, 10, 25];
/** In agorot. */
export const PRICE_OPTIONS = [5000, 8000, 12000];

/** The filter sheet: tags from the vocabulary, distance, order and price. */
@Component({
  selector: 'menu-filter-sheet',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    LocalizePipe,
  ],
  templateUrl: './filter-sheet.html',
  styleUrl: './filter-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterSheet {
  protected readonly store = inject(FeedStore);
  protected readonly t = injectMessages(feedMessages);
  protected readonly radiusOptions = RADIUS_OPTIONS;
  protected readonly priceOptions = PRICE_OPTIONS;

  readonly closed = output();

  private readonly current = this.store.filters();
  protected readonly form = new FormGroup({
    tagIds: new FormControl<string[]>(this.current.tagIds, { nonNullable: true }),
    radiusKm: new FormControl(this.current.radiusKm, { nonNullable: true }),
    sort: new FormControl<FeedSort>(this.current.sort, { nonNullable: true }),
    maxPrice: new FormControl<number | null>(this.current.maxPrice),
  });

  constructor() {
    void this.store.loadTags();
  }

  protected apply(): void {
    const value = this.form.getRawValue();
    void this.store.setFilters(value);
    this.closed.emit();
  }

  protected reset(): void {
    this.form.setValue(DEFAULT_FILTERS);
  }
}
