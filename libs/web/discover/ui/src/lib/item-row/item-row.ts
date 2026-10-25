import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type DiscoverItem } from '@menu/shared/contracts';
import { DistancePipe, LocalizePipe, PricePipe, injectTranslate } from '@menu/web/shared/util-i18n';
import { ScoreBadge } from '../score-badge/score-badge';
import { uiI18n } from '../ui.i18n';

@Component({
  selector: 'menu-item-row',
  imports: [NgOptimizedImage, RouterLink, ScoreBadge, LocalizePipe, DistancePipe, PricePipe],
  templateUrl: './item-row.html',
  styleUrl: './item-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.unranked]': 'item().score === null' },
})
export class ItemRow {
  readonly item = input.required<DiscoverItem>();
  readonly showVenue = input(true);

  protected readonly t = injectTranslate(uiI18n);
}
