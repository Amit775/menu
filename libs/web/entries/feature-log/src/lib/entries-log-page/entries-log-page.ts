import { HttpErrorResponse } from '@angular/common/http';
import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { disabled, form, FormField, maxLength, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import {
  type Entry,
  type EntryVisibility,
  ShekelsSchema,
  type UpdateEntry,
} from '@menu/shared/contracts';
import { ItemEntriesStore, LastVisibility, PhotoShrinker } from '@menu/web/entries/data-access';
import { RatingInput } from '@menu/web/entries/ui';
import { injectTranslate, LocalizePipe, PricePipe } from '@menu/web/shared/util-i18n';
import { logI18n } from '../log.i18n';
import { fromLocalInput, toLocalInput } from './local-time';

interface LogModel {
  variationId: string | null;
  rating: number | null;
  wouldOrderAgain: boolean | null;
  price: number | null;
  eatenAt: string;
  text: string;
  visibility: EntryVisibility;
}

type SaveError = 'failed' | 'closed' | 'photoRejected' | 'photoFailed';

type PhotoChange =
  | { kind: 'keep' }
  | { kind: 'set'; photo: Blob; preview: string }
  | { kind: 'remove' };

@Component({
  selector: 'menu-entries-log-page',
  imports: [
    FormField,
    RouterLink,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    RatingInput,
    LocalizePipe,
    PricePipe,
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
  private readonly shrinker = inject(PhotoShrinker);
  protected readonly t = injectTranslate(logI18n);

  readonly itemId = input.required<string>();
  readonly entryId = input<string>();

  protected readonly maxDate = toLocalInput(new Date());

  protected readonly saving = signal(false);
  protected readonly saveError = linkedSignal<string, SaveError | null>({
    source: this.itemId,
    computation: () => null,
  });
  protected readonly confirmingDelete = linkedSignal({
    source: this.itemId,
    computation: () => false,
  });
  protected readonly photoChange = linkedSignal<string, PhotoChange>({
    source: this.itemId,
    computation: () => ({ kind: 'keep' }),
  });
  protected readonly preparingPhoto = signal(false);
  private readonly created = linkedSignal<string, string | undefined>({
    source: this.itemId,
    computation: () => undefined,
  });

  protected readonly editing = computed<Entry | null | undefined>(() => {
    const id = this.entryId() ?? this.created();
    return id === undefined
      ? undefined
      : (this.store.mine().find((entry) => entry.id === id) ?? null);
  });

  private readonly prefilled = computed(() => {
    const editing = this.editing();
    return editing
      ? editing.pricePaid
      : (this.store.lastPaid() ?? this.store.sheet()?.item.listPrice ?? null);
  });

  protected readonly model = linkedSignal<LogModel>(() => {
    this.itemId();
    const editing = this.editing();
    return {
      variationId: editing?.variationId ?? null,
      rating: editing?.rating ?? null,
      wouldOrderAgain: editing?.wouldOrderAgain ?? null,
      price: this.prefilled()?.value ?? null,
      eatenAt: toLocalInput(editing ? new Date(editing.eatenAt) : new Date()),
      text: editing?.text ?? '',
      visibility: editing?.visibility ?? this.lastVisibility.get(),
    };
  });

  protected readonly variations = computed(() => {
    const kept = this.editing()?.variationId ?? null;
    return (this.store.sheet()?.item.variations ?? []).filter(
      (variation) => variation.available || variation.id === kept,
    );
  });

  protected readonly menuPrice = computed(() => {
    const picked = this.variations().find((v) => v.id === this.model().variationId);
    return picked?.price ?? this.store.sheet()?.item.listPrice ?? null;
  });

  protected readonly form = form(this.model, (path) => {
    disabled(path.rating, { when: () => this.saving() });
    validate(path.price, ({ value }) => {
      const price = value();
      return price === null || ShekelsSchema.safeParse(price).success ? null : { kind: 'price' };
    });
    validate(path.eatenAt, ({ value }) => {
      const iso = fromLocalInput(value());
      if (iso === null) {
        return { kind: 'date' };
      }
      return Date.parse(iso) > Date.now() + 60_000 ? { kind: 'future' } : null;
    });
    maxLength(path.text, 2000);
  });

  protected readonly eatenAtFuture = computed(() =>
    this.form
      .eatenAt()
      .errors()
      .some((error) => error.kind === 'future'),
  );

  protected readonly photoPreview = computed(() => {
    const change = this.photoChange();
    if (change.kind === 'set') {
      return change.preview;
    }
    return change.kind === 'remove' ? null : (this.editing()?.photoUrl ?? null);
  });

  protected readonly photoBackground = computed(() => {
    const preview = this.photoPreview();
    return preview === null ? null : `url(${preview})`;
  });

  protected readonly pickLabel = computed(() => {
    if (this.preparingPhoto()) {
      return this.t('preparingPhoto');
    }
    return this.t(this.photoPreview() === null ? 'addPhoto' : 'changePhoto');
  });

  protected readonly status = computed(() =>
    this.store.status() === 'loaded' && this.editing() === null ? 'not-found' : this.store.status(),
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.changePhoto({ kind: 'keep' });
    });
    this.store.load(this.itemId);
  }

  protected toggleVariation(id: string): void {
    this.form.variationId().value.update((current) => (current === id ? null : id));
  }

  protected toggleOrderAgain(value: boolean): void {
    this.form.wouldOrderAgain().value.update((current) => (current === value ? null : value));
  }

  protected cancel(): void {
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
    } else {
      void this.router.navigateByUrl(`/items/${this.itemId()}`);
    }
  }

  protected async pickPhoto(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    // Cleared, so picking the same file again still counts as a change.
    input.value = '';
    if (!file) {
      return;
    }
    this.preparingPhoto.set(true);
    try {
      const photo = await this.shrinker.shrink(file);
      this.changePhoto({ kind: 'set', photo, preview: URL.createObjectURL(photo) });
    } finally {
      this.preparingPhoto.set(false);
    }
  }

  protected removePhoto(): void {
    this.changePhoto({ kind: this.editing()?.photoUrl ? 'remove' : 'keep' });
  }

  protected retry(): void {
    this.store.reload();
  }

  protected async save(): Promise<void> {
    if (this.saving() || this.preparingPhoto()) {
      return;
    }
    if (this.form().invalid()) {
      this.form().markAsTouched();
      const first = [this.form.price, this.form.eatenAt, this.form.text].find((field) =>
        field().invalid(),
      );
      first?.().focusBoundControl();
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    const model = this.model();
    const input: UpdateEntry = {
      variationId: model.variationId,
      rating: model.rating,
      wouldOrderAgain: model.wouldOrderAgain,
      pricePaid: model.price === null ? null : { value: model.price, currency: 'ILS' },
      text: model.text.trim(),
      visibility: model.visibility,
    };
    const editing = this.editing();
    // Editing keeps the date unless the user changed it.
    const eatenAt = fromLocalInput(model.eatenAt);
    if (
      eatenAt !== null &&
      (!editing || model.eatenAt !== toLocalInput(new Date(editing.eatenAt)))
    ) {
      input.eatenAt = eatenAt;
    }
    let saved: Entry;
    try {
      saved = editing
        ? await this.store.update(editing.id, input)
        : await this.store.create(this.itemId(), input);
    } catch (error) {
      this.saveError.set(
        error instanceof HttpErrorResponse && error.status === 403 ? 'closed' : 'failed',
      );
      this.saving.set(false);
      return;
    }
    try {
      await this.savePhoto(saved.id);
      void this.router.navigate(['/items', this.itemId(), 'entries'], { replaceUrl: true });
    } catch (error) {
      this.saveError.set(
        error instanceof HttpErrorResponse && (error.status === 413 || error.status === 415)
          ? 'photoRejected'
          : 'photoFailed',
      );
      // The entry exists now: trying again edits it rather than logging it twice.
      this.created.set(saved.id);
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

  private async savePhoto(entryId: string): Promise<void> {
    const change = this.photoChange();
    if (change.kind === 'set') {
      await this.store.setPhoto(entryId, change.photo);
    } else if (change.kind === 'remove') {
      await this.store.removePhoto(entryId);
    }
    this.changePhoto({ kind: 'keep' });
  }

  private changePhoto(change: PhotoChange): void {
    const previous = this.photoChange();
    if (previous.kind === 'set') {
      URL.revokeObjectURL(previous.preview);
    }
    this.photoChange.set(change);
  }
}
