import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  type ItemChange,
  type ItemHistoryEvent,
  type Price,
  type Text,
} from '@menu/shared/contracts';
import {
  formatList,
  formatPrice,
  I18n,
  injectTranslate,
  MonthYearPipe,
} from '@menu/web/shared/util-i18n';
import { uiI18n } from '../ui.i18n';

@Component({
  selector: 'menu-item-history',
  imports: [MonthYearPipe],
  templateUrl: './item-history.html',
  styleUrl: './item-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemHistory {
  readonly events = input.required<readonly ItemHistoryEvent[]>();

  private readonly i18n = inject(I18n);
  protected readonly t = injectTranslate(uiI18n);
  protected readonly rows = computed(() =>
    this.events().map((event) => ({ at: event.at, lines: this.describe(event) })),
  );

  private describe(event: ItemHistoryEvent): string[] {
    switch (event.kind) {
      case 'added':
        return [
          event.listPrice
            ? this.t('historyAddedAt', { price: formatPrice(event.listPrice) })
            : this.t('historyAdded'),
        ];
      case 'archived':
        return [this.t('historyArchived')];
      case 'changed':
        return event.changes.flatMap((change) => this.describeChange(change));
    }
  }

  private describeChange(change: ItemChange): string[] {
    const pick = (text: Text) => this.i18n.pick(text);
    const list = (texts: readonly Text[]) => formatList(texts.map(pick), this.i18n.language());
    const when = (texts: readonly Text[], line: (names: string) => string) =>
      texts.length > 0 ? [line(list(texts))] : [];
    switch (change.field) {
      case 'name':
        return [this.t('historyRenamed', { from: pick(change.from) })];
      case 'description':
        return [this.t('historyDescription')];
      case 'listPrice':
        return [this.describePrice(change.from, change.to, null)];
      case 'section':
        return [
          change.to
            ? this.t('historyMoved', { to: pick(change.to) })
            : this.t('historyMovedUnnamed'),
        ];
      case 'tags':
        return [
          ...when(change.added, (tags) => this.t('historyTagged', { tags })),
          ...when(change.removed, (tags) => this.t('historyUntagged', { tags })),
        ];
      case 'variations':
        return [
          ...when(change.added, (names) => this.t('historyVariationAdded', { names })),
          ...when(change.removed, (names) => this.t('historyVariationRemoved', { names })),
          ...when(change.nowAvailable, (names) => this.t('historyVariationBack', { names })),
          ...when(change.nowUnavailable, (names) => this.t('historyVariationPaused', { names })),
        ];
      case 'variationPrice':
        return [this.describePrice(change.from, change.to, pick(change.variation))];
    }
  }

  private describePrice(from: Price | null, to: Price | null, variation: string | null): string {
    if (variation !== null) {
      if (from && to) {
        const prices = { variation, from: formatPrice(from), to: formatPrice(to) };
        return this.t('historyVariationPrice', prices);
      }
      return to
        ? this.t('historyVariationPriceSet', { variation, to: formatPrice(to) })
        : this.t('historyVariationPriceRemoved', { variation });
    }
    if (from && to) {
      return this.t('historyPrice', { from: formatPrice(from), to: formatPrice(to) });
    }
    return to ? this.t('historyPriceSet', { to: formatPrice(to) }) : this.t('historyPriceRemoved');
  }
}
