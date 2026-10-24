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
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { type Item, type LocalizedText } from '@menu/shared/contracts';
import { VenueManagerStore } from '@menu/web/menus/data-access';
import { injectMessages, LocalizePipe } from '@menu/web/shared/util-i18n';
import { itemFormMessages } from '../item-form.messages';

/** Required, and more than spaces: the API trims names. */
const notBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim() === ''
    ? { required: true }
    : Validators.required(control);

/**
 * J6: add an item to the menu (`/manage/venues/:id/items/new?sectionId=`) or
 * edit one (`/manage/venues/:id/items/:itemId`): names, section, menu price
 * and tags. The Owner's or an Admin's items are approved at once.
 */
@Component({
  selector: 'menu-item-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    LocalizePipe,
  ],
  templateUrl: './item-form-page.html',
  styleUrl: './item-form-page.scss',
  providers: [VenueManagerStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ItemFormPage {
  /** The venue's `:id` route parameter. */
  readonly id = input.required<string>();
  /** `:itemId` when editing; absent on `items/new`. */
  readonly itemId = input<string>();
  /** `?sectionId=`: the section a new item starts in. */
  readonly sectionId = input<string>();

  protected readonly store = inject(VenueManagerStore);
  private readonly router = inject(Router);
  protected readonly t = injectMessages(itemFormMessages);

  protected readonly nameHe = new FormControl('', {
    nonNullable: true,
    validators: [notBlank, Validators.maxLength(200)],
  });
  protected readonly nameEn = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(200)],
  });
  protected readonly section = new FormControl<string | null>(null, (control) =>
    Validators.required(control),
  );
  protected readonly price = new FormControl<number | null>(null, [
    Validators.min(0),
    Validators.max(100_000),
    Validators.pattern(/^\d+$/),
  ]);
  protected readonly tags = new FormControl<string[]>([], { nonNullable: true });
  protected readonly form = new FormGroup({
    nameHe: this.nameHe,
    nameEn: this.nameEn,
    section: this.section,
    price: this.price,
    tags: this.tags,
  });

  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  /** The price the form opened with, in agorot: sent as is unless the user changes it. */
  private prefilled: number | null = null;

  /** The item being edited; undefined for a new one, null when it is not this venue's. */
  protected readonly editing = computed<Item | null | undefined>(() => {
    const id = this.itemId();
    return id === undefined
      ? undefined
      : (this.store.items().find((item) => item.id === id) ?? null);
  });

  protected readonly status = computed(() =>
    this.store.status() === 'loaded' && this.editing() === null ? 'not-found' : this.store.status(),
  );

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.store.load(id));
    });
    effect(() => {
      if (this.store.status() !== 'loaded') {
        return;
      }
      const editing = this.editing();
      const sectionId = this.sectionId();
      untracked(() => {
        this.fill(editing ?? undefined, sectionId);
      });
    });
  }

  protected retry(): void {
    void this.store.load(this.id());
  }

  protected async save(): Promise<void> {
    const sectionId = this.section.value;
    if (this.form.invalid || sectionId === null || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.failed.set(false);
    const input = {
      sectionId,
      name: this.localizedName(),
      listPrice: this.price.dirty
        ? this.price.value === null
          ? null
          : this.price.value * 100
        : this.prefilled,
      tagIds: this.tags.value,
    };
    try {
      const editing = this.editing();
      await (editing ? this.store.updateItem(editing.id, input) : this.store.addItem(input));
      void this.router.navigate(['/manage/venues', this.id()], { replaceUrl: true });
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  private fill(item: Item | undefined, sectionId: string | undefined): void {
    const known = (id: string | undefined): string | null =>
      id !== undefined && this.store.sectionsById().has(id) ? id : null;
    this.prefilled = item?.listPrice ?? null;
    this.form.reset({
      nameHe: item?.name.he ?? '',
      nameEn: item?.name.en ?? '',
      section: known(item?.sectionId ?? sectionId),
      price: this.prefilled === null ? null : Math.round(this.prefilled / 100),
      tags: item?.tagIds ?? [],
    });
  }

  private localizedName(): LocalizedText {
    const he = this.nameHe.value.trim();
    const en = this.nameEn.value.trim();
    return en ? { he, en } : { he };
  }
}
