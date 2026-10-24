import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VenueManagerStore } from '@menu/web/menus/data-access';
import { I18n, injectMessages } from '@menu/web/shared/util-i18n';
import { venueManagerMessages } from '../venue-manager.messages';

/**
 * J6: how the venue's items do. Public entries are counted as they are; other
 * entries only as a count from 3 up (the score floor), so no one is singled out.
 */
@Component({
  selector: 'menu-insights-table',
  imports: [MatProgressSpinnerModule],
  templateUrl: './insights-table.html',
  styleUrl: './insights-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InsightsTable {
  protected readonly store = inject(VenueManagerStore);
  private readonly i18n = inject(I18n);
  protected readonly t = injectMessages(venueManagerMessages);
  protected readonly failed = signal(false);

  protected readonly rows = computed(() =>
    [...(this.store.insights()?.items ?? [])]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || b.ratingCount - a.ratingCount)
      .map((row) => ({
        ...row,
        label: this.i18n.pick(row.name),
        score: row.score === null ? this.t().none : row.score.toFixed(1),
        other: row.otherEntryCount === null ? this.t().fewer : String(row.otherEntryCount),
        again:
          row.wouldOrderAgainPercent === null
            ? this.t().none
            : `${String(row.wouldOrderAgainPercent)}%`,
      })),
  );

  protected readonly tiles = computed(() => {
    const items = this.store.insights()?.items ?? [];
    const others = items.map((row) => row.otherEntryCount).filter((count) => count !== null);
    const top = this.rows().find((row) => row.score !== this.t().none);
    return {
      public: String(items.reduce((sum, row) => sum + row.publicEntryCount, 0)),
      other: others.length === 0 ? this.t().fewer : String(others.reduce((sum, n) => sum + n, 0)),
      top: top ? `${top.label} · ${top.score}` : this.t().none,
    };
  });

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.failed.set(false);
    try {
      await this.store.loadInsights();
    } catch {
      this.failed.set(true);
    }
  }
}
