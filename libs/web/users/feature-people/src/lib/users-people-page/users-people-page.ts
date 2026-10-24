import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { type MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { RouterLink } from '@angular/router';
import { type AccountSummary } from '@menu/shared/contracts';
import { AccountStore, PeopleStore } from '@menu/web/users/data-access';
import { I18n, injectMessages, RelativeDatePipe } from '@menu/web/shared/util-i18n';
import { peopleMessages } from '../people.messages';

/**
 * J7 (Admin, `/manage/people`): every account, named ones first, with a switch
 * for the Admin role. Owners are granted per venue, from the venue's page.
 */
@Component({
  selector: 'menu-users-people-page',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    RelativeDatePipe,
  ],
  templateUrl: './users-people-page.html',
  styleUrl: './users-people-page.scss',
  providers: [PeopleStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPeoplePage {
  protected readonly store = inject(PeopleStore);
  private readonly me = inject(AccountStore);
  private readonly i18n = inject(I18n);
  protected readonly t = injectMessages(peopleMessages);
  protected readonly backIcon = computed(() =>
    this.i18n.dir() === 'rtl' ? 'arrow_forward' : 'arrow_back',
  );

  protected readonly rows = computed(() => {
    const myId = this.me.account()?.id;
    return this.store.sorted().map((account) => ({
      account,
      name: account.displayName || this.t().noName,
      isMe: account.id === myId,
    }));
  });

  protected readonly busy = signal<string | null>(null);
  protected readonly failed = signal<string | null>(null);

  constructor() {
    void this.store.load();
  }

  protected retry(): void {
    void this.store.load();
  }

  protected async toggle(account: AccountSummary, change: MatSlideToggleChange): Promise<void> {
    this.busy.set(account.id);
    this.failed.set(null);
    try {
      await this.store.setAdmin(account.id, change.checked);
    } catch {
      // The switch flipped on tap; put it back to what the account still is.
      change.source.checked = account.isAdmin;
      this.failed.set(account.id);
    } finally {
      this.busy.set(null);
    }
  }
}
