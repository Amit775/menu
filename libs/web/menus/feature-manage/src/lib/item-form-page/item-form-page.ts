import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { form, FormField, max, maxLength, min, required, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { type Item, type LocalizedText } from '@menu/shared/contracts';
import { VenueManagerStore } from '@menu/web/menus/data-access';
import { injectTranslate, LocalizePipe } from '@menu/web/shared/util-i18n';
import { itemFormI18n } from '../item-form.i18n';

interface ItemModel {
  nameHe: string;
  nameEn: string;
  section: string | null;
  price: number | null;
  tags: string[];
}

/**
 * J6: add an item to the menu (`/manage/venues/:id/items/new?sectionId=`) or
 * edit one (`/manage/venues/:id/items/:itemId`): names, section, menu price
 * and tags. The Owner's or an Admin's items are approved at once.
 */
@Component({
  selector: 'menu-item-form-page',
  imports: [
    FormField,
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
  protected readonly t = injectTranslate(itemFormI18n);

  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

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

  protected readonly model = linkedSignal<ItemModel>(() => {
    const item = this.editing() ?? undefined;
    const sectionId = item?.sectionId ?? this.sectionId();
    const listPrice = item?.listPrice ?? null;
    return {
      nameHe: item?.name.he ?? '',
      nameEn: item?.name.en ?? '',
      section:
        sectionId !== undefined && this.store.sectionsById().has(sectionId) ? sectionId : null,
      price: listPrice === null ? null : Math.round(listPrice / 100),
      tags: item?.tagIds ?? [],
    };
  });

  protected readonly form = form(
    this.model,
    (path) => {
      required(path.nameHe);
      validate(path.nameHe, ({ value }) => (value().trim() === '' ? { kind: 'required' } : null));
      maxLength(path.nameHe, 200);
      maxLength(path.nameEn, 200);
      required(path.section);
      min(path.price, 0);
      max(path.price, 100_000);
      validate(path.price, ({ value }) => {
        const price = value();
        return price === null || Number.isInteger(price) ? null : { kind: 'whole' };
      });
    },
    { name: 'item' },
  );

  constructor() {
    this.store.load(this.id);
  }

  protected retry(): void {
    this.store.reload();
  }

  protected async save(): Promise<void> {
    const model = this.model();
    const sectionId = model.section;
    if (this.form().invalid() || sectionId === null || this.saving()) {
      this.form().markAsTouched();
      return;
    }
    this.saving.set(true);
    this.failed.set(false);
    const editing = this.editing();
    const input = {
      sectionId,
      name: this.localizedName(model),
      listPrice: this.form.price().dirty()
        ? model.price === null
          ? null
          : model.price * 100
        : (editing?.listPrice ?? null),
      tagIds: model.tags,
    };
    try {
      await (editing ? this.store.updateItem(editing.id, input) : this.store.addItem(input));
      void this.router.navigate(['/manage/venues', this.id()], { replaceUrl: true });
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  private localizedName(model: ItemModel): LocalizedText {
    const he = model.nameHe.trim();
    const en = model.nameEn.trim();
    return en ? { he, en } : { he };
  }
}
