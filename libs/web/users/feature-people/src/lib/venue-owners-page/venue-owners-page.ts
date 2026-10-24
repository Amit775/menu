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
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { type Ownership } from '@menu/shared/contracts';
import { PeopleStore } from '@menu/web/users/data-access';
import { I18n, injectMessages, RelativeDatePipe } from '@menu/web/shared/util-i18n';
import { peopleMessages } from '../people.messages';

/**
 * J7 (Admin, `/manage/people/owners/:venueId`): who owns one venue. Grant an
 * account ownership, or take it away with a second tap. The venue's name lives
 * in the menus domain, so the page links back to the venue instead.
 */
@Component({
  selector: 'menu-venue-owners-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    RelativeDatePipe,
  ],
  templateUrl: './venue-owners-page.html',
  styleUrl: '../users-people-page/users-people-page.scss',
  providers: [PeopleStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueOwnersPage {
  /** The `:venueId` route parameter. */
  readonly venueId = input.required<string>();

  protected readonly store = inject(PeopleStore);
  private readonly i18n = inject(I18n);
  protected readonly t = injectMessages(peopleMessages);
  protected readonly backIcon = computed(() =>
    this.i18n.dir() === 'rtl' ? 'arrow_forward' : 'arrow_back',
  );

  protected readonly candidates = computed(() =>
    this.store.candidates().map((account) => ({
      id: account.id,
      name: account.displayName || this.t().noName,
    })),
  );
  protected readonly account = new FormControl<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);
  protected readonly confirming = signal<string | null>(null);

  constructor() {
    effect(() => {
      const venueId = this.venueId();
      untracked(() => void this.store.load(venueId));
    });
  }

  protected retry(): void {
    void this.store.load(this.venueId());
  }

  protected name(owner: Ownership): string {
    return owner.displayName || this.t().noName;
  }

  protected async grant(): Promise<void> {
    const accountId = this.account.value;
    if (accountId && (await this.run(() => this.store.grant(accountId)))) {
      this.account.reset(null);
    }
  }

  protected async revoke(owner: Ownership): Promise<void> {
    if (this.confirming() !== owner.accountId) {
      this.confirming.set(owner.accountId);
      return;
    }
    await this.run(() => this.store.revoke(owner.accountId));
  }

  private async run(action: () => Promise<void>): Promise<boolean> {
    this.busy.set(true);
    this.failed.set(false);
    this.confirming.set(null);
    try {
      await action();
      return true;
    } catch {
      this.failed.set(true);
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
