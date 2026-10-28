import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type PersonalStats } from '@menu/shared/contracts';
import { injectTranslate, LocalizePipe, MonthPipe, ShekelsPipe } from '@menu/web/shared/util-i18n';
import { uiI18n } from '../ui.i18n';

@Component({
  selector: 'menu-personal-stats-card',
  imports: [RouterLink, LocalizePipe, MonthPipe, ShekelsPipe],
  templateUrl: './personal-stats-card.html',
  styleUrl: './personal-stats-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PersonalStatsCard {
  readonly stats = input.required<PersonalStats>();

  protected readonly t = injectTranslate(uiI18n);

  protected readonly thisMonth = computed(() => this.stats().months.at(-1)?.entryCount ?? 0);

  protected readonly spending = computed(() => {
    // Shekels are the only currency today (CurrencySchema); a second one needs its own bars.
    const months = this.stats().months.map(({ month, spent }) => ({
      month,
      shekels: spent[0]?.value ?? 0,
    }));
    const most = Math.max(...months.map((month) => month.shekels));
    return most > 0
      ? months.map((month) => ({
          ...month,
          height: `${String(Math.round((100 * month.shekels) / most))}%`,
        }))
      : [];
  });
}
