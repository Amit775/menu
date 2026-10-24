import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { VenueManagerStore } from '@menu/web/menus/data-access';
import { Roles } from '@menu/web/shared/util-auth';
import { I18n, injectMessages, LocalizePipe } from '@menu/web/shared/util-i18n';
import { venueManagerMessages } from '../venue-manager.messages';
import { InsightsTable } from '../venue-manager/insights-table';
import { MenuEditor } from '../venue-manager/menu-editor';
import { PendingQueue } from '../venue-manager/pending-queue';

/**
 * J6 (`/manage/venues/:id`): one venue for its Owner or an Admin. Opens on the
 * pending queue when something waits, otherwise on the menu.
 */
@Component({
  selector: 'menu-venue-manager-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    LocalizePipe,
    PendingQueue,
    MenuEditor,
    InsightsTable,
  ],
  templateUrl: './venue-manager-page.html',
  styleUrl: './venue-manager-page.scss',
  providers: [VenueManagerStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueManagerPage {
  readonly id = input.required<string>();

  protected readonly store = inject(VenueManagerStore);
  protected readonly roles = inject(Roles);
  private readonly i18n = inject(I18n);
  protected readonly t = injectMessages(venueManagerMessages);
  protected readonly backIcon = computed(() =>
    this.i18n.dir() === 'rtl' ? 'arrow_forward' : 'arrow_back',
  );

  private readonly chosenTab = signal<number | null>(null);
  protected readonly tab = computed(
    () => this.chosenTab() ?? (this.store.pending().length > 0 ? 0 : 1),
  );

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => {
        this.chosenTab.set(null);
        void this.store.load(id);
      });
    });
  }

  protected choose(index: number): void {
    this.chosenTab.set(index);
  }

  protected retry(): void {
    void this.store.load(this.id());
  }
}
