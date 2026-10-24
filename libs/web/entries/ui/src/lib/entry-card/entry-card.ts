import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { type Entry, type PublicEntry } from '@menu/shared/contracts';
import { RelativeDatePipe, ShekelsPipe, injectTranslate } from '@menu/web/shared/util-i18n';
import { uiI18n } from '../ui.i18n';

/**
 * One entry: who wrote it (or "your entry" with its visibility), the rating,
 * would order again, price paid, when, the text and the photo. Actions go in as content.
 */
@Component({
  selector: 'menu-entry-card',
  imports: [NgOptimizedImage, RelativeDatePipe, ShekelsPipe],
  templateUrl: './entry-card.html',
  styleUrl: './entry-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.own]': 'own() !== null', '[class.private]': "own()?.visibility === 'private'" },
})
export class EntryCard {
  readonly entry = input.required<Entry | PublicEntry>();

  /** The caller's own entry, or null for someone else's. */
  protected readonly own = computed(() => {
    const entry = this.entry();
    return 'visibility' in entry ? entry : null;
  });

  protected readonly author = computed(() => {
    const entry = this.entry();
    return 'authorName' in entry ? entry.authorName : '';
  });

  protected readonly t = injectTranslate(uiI18n);
}
