import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { DEFAULT_FILTERS, FeedStore, type FeedSort } from '@menu/web/discover/data-access';
import { injectTranslate, LocalizePipe, ShekelsPipe } from '@menu/web/shared/util-i18n';
import { feedI18n } from '../feed.i18n';

export const RADIUS_OPTIONS = [1, 2, 5, 10, 25];
/** In agorot. */
export const PRICE_OPTIONS = [5000, 8000, 12000];

/** The filter sheet (opened as a Material bottom sheet): tags, distance, order and price. */
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
    ShekelsPipe,
  ],
  templateUrl: './filter-sheet.html',
  styleUrl: './filter-sheet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterSheet {
  protected readonly store = inject(FeedStore);
  protected readonly t = injectTranslate(feedI18n);
  protected readonly radiusOptions = RADIUS_OPTIONS;
  protected readonly priceOptions = PRICE_OPTIONS;

  private readonly sheet = inject(MatBottomSheetRef);

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
    this.sheet.dismiss();
  }

  protected close(): void {
    this.sheet.dismiss();
  }

  protected reset(): void {
    this.form.setValue(DEFAULT_FILTERS);
  }
}
