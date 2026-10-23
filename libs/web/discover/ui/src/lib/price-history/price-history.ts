import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type PricePoint } from '@menu/shared/contracts';
import { MessagesPipe, ShekelsPipe } from '@menu/web/shared/util-i18n';
import { discoverUiMessages } from '../ui.messages';

/** Average price per month as bars, oldest first; the latest month is highlighted. */
@Component({
  selector: 'menu-price-history',
  imports: [MessagesPipe, ShekelsPipe],
  templateUrl: './price-history.html',
  styleUrl: './price-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PriceHistory {
  readonly points = input.required<readonly PricePoint[]>();

  protected readonly messages = discoverUiMessages;
  protected readonly bars = computed(() => {
    const points = this.points();
    const max = Math.max(...points.map((point) => point.averagePrice), 1);
    return points.map((point, index) => ({
      ...point,
      height: Math.max(8, Math.round((point.averagePrice / max) * 100)),
      latest: index === points.length - 1,
    }));
  });
}
