import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { form, FormField, maxLength, required, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { type Item, ShekelsSchema, type Text } from '@menu/shared/contracts';
import { VenueManagerStore } from '@menu/web/menus/data-access';
import { injectTranslate, LocalizePipe } from '@menu/web/shared/util-i18n';
import { itemFormI18n } from '../item-form.i18n';

interface ItemModel {
  nameHe: string;
  nameEn: string;
  descriptionHe: string;
  descriptionEn: string;
  section: string | null;
  price: number | null;
  tags: string[];
}

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
  readonly id = input.required<string>();
  readonly itemId = input<string>();
  readonly sectionId = input<string>();

  protected readonly store = inject(VenueManagerStore);
  private readonly router = inject(Router);
  protected readonly t = injectTranslate(itemFormI18n);

  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

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
    return {
      nameHe: item?.name.he ?? '',
      nameEn: item?.name.en ?? '',
      descriptionHe: item?.description?.he ?? '',
      descriptionEn: item?.description?.en ?? '',
      section:
        sectionId !== undefined && this.store.sectionsById().has(sectionId) ? sectionId : null,
      price: item?.listPrice?.value ?? null,
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
      maxLength(path.descriptionHe, 2000);
      maxLength(path.descriptionEn, 2000);
      validate(path.descriptionHe, (field) =>
        field.value().trim() === '' && field.valueOf(path.descriptionEn).trim() !== ''
          ? { kind: 'required' }
          : null,
      );
      required(path.section);
      validate(path.price, ({ value }) => {
        const price = value();
        return price === null || ShekelsSchema.safeParse(price).success ? null : { kind: 'price' };
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
      name: textOf(model.nameHe, model.nameEn),
      description: model.descriptionHe.trim()
        ? textOf(model.descriptionHe, model.descriptionEn)
        : null,
      listPrice: model.price === null ? null : { value: model.price, currency: 'ILS' as const },
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
}

function textOf(he: string, en: string): Text {
  return { he: he.trim(), en: en.trim() || null };
}
