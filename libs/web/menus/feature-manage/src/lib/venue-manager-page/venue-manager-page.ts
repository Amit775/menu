import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import { VenueManagerStore } from '@menu/web/menus/data-access';
import { Roles } from '@menu/web/shared/util-auth';
import { I18n, injectTranslate, LocalizePipe } from '@menu/web/shared/util-i18n';
import { venueManagerI18n } from '../venue-manager.i18n';
import { InsightsTable } from '../venue-manager/insights-table';
import { MenuEditor } from '../venue-manager/menu-editor';
import { PendingQueue } from '../venue-manager/pending-queue';

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
  protected readonly t = injectTranslate(venueManagerI18n);
  protected readonly backIcon = computed(() =>
    this.i18n.dir() === 'rtl' ? 'arrow_forward' : 'arrow_back',
  );

  protected readonly tab = linkedSignal<string | null | undefined, number>({
    source: () => (this.store.status() === 'loaded' ? this.store.venue()?.id : null),
    computation: () => untracked(() => (this.store.pending().length > 0 ? 0 : 1)),
  });

  constructor() {
    this.store.load(this.id);
  }

  protected choose(index: number): void {
    this.tab.set(index);
  }

  protected retry(): void {
    this.store.reload();
  }
}
