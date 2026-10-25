import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { type PricePoint } from '@menu/shared/contracts';
import { formatMonth, I18n, injectTranslate, PricePipe } from '@menu/web/shared/util-i18n';
import { uiI18n } from '../ui.i18n';

@Component({
  selector: 'menu-price-history',
  imports: [PricePipe],
  templateUrl: './price-history.html',
  styleUrl: './price-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceHistory {
  readonly points = input.required<readonly PricePoint[]>();

  private readonly i18n = inject(I18n);
  protected readonly t = injectTranslate(uiI18n);
  protected readonly bars = computed(() => {
    const points = this.points();
    const max = Math.max(...points.map((point) => point.averagePrice.value), 1);
    return points.map((point, index) => ({
      ...point,
      height: Math.max(8, Math.round((point.averagePrice.value / max) * 100)),
      latest: index === points.length - 1,
      label: formatMonth(point.month, this.i18n.language()),
    }));
  });
}
