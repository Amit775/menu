import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type DiscoverItem } from '@menu/shared/contracts';
import { DistancePipe, LocalizePipe, MessagesPipe, ShekelsPipe } from '@menu/web/shared/util-i18n';
import { ScoreBadge } from '../score-badge/score-badge';
import { discoverUiMessages } from '../ui.messages';

/**
 * One item in a list: name (with the flag when the user wrote about it), venue,
 * distance and price, the reorder ratio, and the score chip. Links to the item.
 * `showVenue` is off on the venue's own page.
 */
@Component({
  selector: 'menu-item-row',
  imports: [
    NgOptimizedImage,
    RouterLink,
    ScoreBadge,
    LocalizePipe,
    DistancePipe,
    ShekelsPipe,
    MessagesPipe,
  ],
  templateUrl: './item-row.html',
  styleUrl: './item-row.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.unranked]': 'item().score === null' },
})
export class ItemRow {
  readonly item = input.required<DiscoverItem>();
  readonly showVenue = input(true);

  protected readonly messages = discoverUiMessages;
}
