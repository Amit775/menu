import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { type ItemChange, type ItemHistoryEvent, type Text } from '@menu/shared/contracts';
import { formatPrice, I18n, injectTranslate, MonthYearPipe } from '@menu/web/shared/util-i18n';
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
        return event.changes.map((change) => this.describeChange(change));
    }
  }

  private describeChange(change: ItemChange): string {
    const pick = (text: Text) => this.i18n.pick(text);
    switch (change.field) {
      case 'name':
        return this.t('historyRenamed', { from: pick(change.from) });
      case 'description':
        return this.t('historyDescription');
      case 'listPrice':
        if (change.from && change.to) {
          return this.t('historyPrice', {
            from: formatPrice(change.from),
            to: formatPrice(change.to),
          });
        }
        return change.to
          ? this.t('historyPriceSet', { to: formatPrice(change.to) })
          : this.t('historyPriceRemoved');
      case 'section':
        return change.to
          ? this.t('historyMoved', { to: pick(change.to) })
          : this.t('historyMovedUnnamed');
      case 'tags':
        return [
          ...(change.added.length > 0
            ? [this.t('historyTagged', { tags: change.added.map(pick).join(', ') })]
            : []),
          ...(change.removed.length > 0
            ? [this.t('historyUntagged', { tags: change.removed.map(pick).join(', ') })]
            : []),
        ].join(' · ');
    }
  }
}
