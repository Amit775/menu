import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
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
import {
  type AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { type Entry, type EntryVisibility, type UpdateEntry } from '@menu/shared/contracts';
import { ItemEntriesStore, LastVisibility } from '@menu/web/entries/data-access';
import { RatingInput } from '@menu/web/entries/ui';
import { injectMessages, LocalizePipe, ShekelsPipe } from '@menu/web/shared/util-i18n';
import { logMessages } from '../log.messages';
import { fromLocalInput, toLocalInput } from './local-time';

const MAX_SHEKELS = 100_000;

function notInFuture(control: AbstractControl<string>): ValidationErrors | null {
  const iso = fromLocalInput(control.value);
  if (iso === null) {
    return { date: true };
  }
  return Date.parse(iso) > Date.now() + 60_000 ? { future: true } : null;
}

type SaveError = 'failed' | 'closed';

/**
 * J3: log what I ate, or edit an entry (`/log/:itemId[/:entryId]`). One screen:
 * rating, would order again, price paid (prefilled), when, a note and who sees it.
 */
@Component({
  selector: 'menu-entries-log-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RatingInput,
    LocalizePipe,
    ShekelsPipe,
  ],
  templateUrl: './entries-log-page.html',
  styleUrl: './entries-log-page.scss',
  providers: [ItemEntriesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntriesLogPage {
  protected readonly store = inject(ItemEntriesStore);
  private readonly lastVisibility = inject(LastVisibility);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  protected readonly t = injectMessages(logMessages);

  /** The `:itemId` route parameter. */
  readonly itemId = input.required<string>();
  /** The `:entryId` route parameter, when editing. */
  readonly entryId = input<string>();

  protected readonly rating = signal<number | null>(null);
  protected readonly wouldOrderAgain = signal<boolean | null>(null);
  protected readonly price = new FormControl<number | null>(null, [
    Validators.min(0),
    Validators.max(MAX_SHEKELS),
    Validators.pattern(/^\d+$/),
  ]);
  protected readonly eatenAt = new FormControl(toLocalInput(new Date()), {
    nonNullable: true,
    validators: [notInFuture],
  });
  protected readonly text = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(2000)],
  });
  protected readonly visibility = new FormControl<EntryVisibility>(this.lastVisibility.get(), {
    nonNullable: true,
  });
  protected readonly form = new FormGroup({
    price: this.price,
    eatenAt: this.eatenAt,
    text: this.text,
    visibility: this.visibility,
  });
  protected readonly maxDate = toLocalInput(new Date());

  protected readonly saving = signal(false);
  protected readonly saveError = signal<SaveError | null>(null);
  protected readonly confirmingDelete = signal(false);
  private filled = false;

  /** The entry being edited, once the sheet is here; undefined for a new one. */
  protected readonly editing = computed<Entry | null | undefined>(() => {
    const id = this.entryId();
    return id === undefined
      ? undefined
      : (this.store.mine().find((entry) => entry.id === id) ?? null);
  });

  protected readonly status = computed(() =>
    this.store.status() === 'loaded' && this.editing() === null ? 'not-found' : this.store.status(),
  );

  constructor() {
    effect(() => {
      const itemId = this.itemId();
      untracked(() => void this.store.load(itemId));
    });
    // Fill the form once, when the item (and the entry being edited) is here.
    effect(() => {
      const sheet = this.store.sheet();
      const editing = this.editing();
      if (!sheet || editing === null || this.filled) {
        return;
      }
      this.filled = true;
      untracked(() => {
        if (editing) {
          this.fill(editing);
        } else {
          const price = this.store.lastPaid() ?? sheet.item.listPrice;
          this.price.setValue(price === null ? null : Math.round(price / 100));
        }
      });
    });
  }

  protected toggleOrderAgain(value: boolean): void {
    this.wouldOrderAgain.update((current) => (current === value ? null : value));
  }

  protected cancel(): void {
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
    } else {
      void this.router.navigateByUrl(`/items/${this.itemId()}`);
    }
  }

  protected retry(): void {
    void this.store.load(this.itemId());
  }

  protected async save(): Promise<void> {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    const input: UpdateEntry = {
      rating: this.rating(),
      wouldOrderAgain: this.wouldOrderAgain(),
      pricePaid: this.price.value === null ? null : this.price.value * 100,
      text: this.text.value.trim(),
      visibility: this.visibility.value,
    };
    const editing = this.editing();
    // Editing keeps the date unless the user changed it.
    const eatenAt = fromLocalInput(this.eatenAt.value);
    if (eatenAt !== null && (!editing || this.eatenAt.dirty)) {
      input.eatenAt = eatenAt;
    }
    try {
      if (editing) {
        await this.store.update(editing.id, input);
      } else {
        await this.store.create(this.itemId(), input);
      }
      void this.router.navigate(['/items', this.itemId(), 'entries'], { replaceUrl: true });
    } catch (error) {
      this.saveError.set(
        error instanceof HttpErrorResponse && error.status === 403 ? 'closed' : 'failed',
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const editing = this.editing();
    if (!editing) {
      return;
    }
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      return;
    }
    this.saving.set(true);
    try {
      await this.store.remove(editing.id);
      void this.router.navigate(['/items', this.itemId(), 'entries'], { replaceUrl: true });
    } catch {
      this.saveError.set('failed');
    } finally {
      this.saving.set(false);
      this.confirmingDelete.set(false);
    }
  }

  private fill(entry: Entry): void {
    this.rating.set(entry.rating);
    this.wouldOrderAgain.set(entry.wouldOrderAgain);
    this.form.reset({
      price: entry.pricePaid === null ? null : Math.round(entry.pricePaid / 100),
      eatenAt: toLocalInput(new Date(entry.eatenAt)),
      text: entry.text,
      visibility: entry.visibility,
    });
  }
}
