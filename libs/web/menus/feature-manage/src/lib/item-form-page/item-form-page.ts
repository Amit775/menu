import { HttpErrorResponse } from '@angular/common/http';
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
import { applyEach, form, FormField, maxLength, required, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import {
  type Item,
  type ItemVariationInput,
  ShekelsSchema,
  type Text,
} from '@menu/shared/contracts';
import { VenueManagerStore } from '@menu/web/menus/data-access';
import { Roles } from '@menu/web/shared/util-auth';
import { PhotoShrinker } from '@menu/web/shared/util-device';
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
  variations: VariationModel[];
}

interface VariationModel {
  id: string | null;
  nameHe: string;
  nameEn: string;
  price: number | null;
  tags: string[];
  available: boolean;
}

const MAX_VARIATIONS = 20;

type PhotoChange =
  | { kind: 'keep' }
  | { kind: 'set'; photo: Blob; preview: string }
  | { kind: 'remove' };

type SaveError = 'failed' | 'photoRejected' | 'photoFailed';

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
  private readonly shrinker = inject(PhotoShrinker);
  private readonly roles = inject(Roles);
  protected readonly t = injectTranslate(itemFormI18n);

  protected readonly saving = signal(false);
  protected readonly saveError = signal<SaveError | null>(null);
  protected readonly preparingPhoto = signal(false);
  protected readonly photoChange = linkedSignal<string | undefined, PhotoChange>({
    source: this.itemId,
    computation: () => ({ kind: 'keep' }),
  });
  // Set once a new item is saved, so a retried photo upload edits it rather than adding it twice.
  private readonly created = linkedSignal<string | undefined, string | undefined>({
    source: this.itemId,
    computation: () => undefined,
  });

  /** A Contributor who does not manage this venue cannot open its manage page. */
  protected readonly venueLink = computed(() =>
    this.roles.canContribute() && !this.roles.canEditVenue(this.id())
      ? ['/venues', this.id()]
      : ['/manage/venues', this.id()],
  );

  protected readonly editing = computed<Item | null | undefined>(() => {
    const id = this.itemId() ?? this.created();
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
      variations: (item?.variations ?? []).map((variation) => ({
        id: variation.id,
        nameHe: variation.name.he,
        nameEn: variation.name.en ?? '',
        price: variation.price?.value ?? null,
        tags: variation.tagIds,
        available: variation.available,
      })),
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
      validate(path.price, validPrice);
      applyEach(path.variations, (variation) => {
        maxLength(variation.nameHe, 200);
        maxLength(variation.nameEn, 200);
        validate(variation.nameHe, (field) => {
          const name = field.value().trim();
          const sameName = field
            .valueOf(path.variations)
            .filter((other) => other.nameHe.trim() === name).length;
          return name === '' || sameName > 1 ? { kind: 'variationName' } : null;
        });
        validate(variation.price, validPrice);
      });
    },
    { name: 'item' },
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

  protected readonly canAddVariation = computed(
    () => this.model().variations.length < MAX_VARIATIONS,
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.changePhoto({ kind: 'keep' });
    });
    this.store.load(this.id);
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

  private firstInvalid() {
    const fields = [
      this.form.nameHe,
      this.form.descriptionHe,
      this.form.section,
      this.form.price,
      ...[...this.form.variations].flatMap((variation) => [variation.nameHe, variation.price]),
    ];
    return fields.map((field) => field()).find((state) => state.invalid());
  }

  protected addVariation(): void {
    this.form
      .variations()
      .value.update((variations) => [
        ...variations,
        { id: null, nameHe: '', nameEn: '', price: null, tags: [], available: true },
      ]);
  }

  protected removeVariation(index: number): void {
    this.form.variations().value.update((variations) => variations.filter((_, i) => i !== index));
  }

  protected retry(): void {
    this.store.reload();
  }

  protected async save(): Promise<void> {
    const model = this.model();
    const sectionId = model.section;
    if (this.form().invalid() || sectionId === null || this.saving() || this.preparingPhoto()) {
      this.form().markAsTouched();
      this.firstInvalid()?.focusBoundControl();
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    const editing = this.editing();
    const input = {
      sectionId,
      name: textOf(model.nameHe, model.nameEn),
      description: model.descriptionHe.trim()
        ? textOf(model.descriptionHe, model.descriptionEn)
        : null,
      listPrice: model.price === null ? null : { value: model.price, currency: 'ILS' as const },
      tagIds: model.tags,
      variations: model.variations.map(variationInput),
    };
    let saved: Item;
    try {
      saved = await (editing
        ? this.store.updateItem(editing.id, input)
        : this.store.addItem(input));
    } catch {
      this.saveError.set('failed');
      this.saving.set(false);
      return;
    }
    try {
      await this.savePhoto(saved.id);
      void this.router.navigate(this.venueLink(), { replaceUrl: true });
    } catch (error) {
      this.saveError.set(
        error instanceof HttpErrorResponse && (error.status === 413 || error.status === 415)
          ? 'photoRejected'
          : 'photoFailed',
      );
      this.created.set(saved.id);
    } finally {
      this.saving.set(false);
    }
  }

  private async savePhoto(itemId: string): Promise<void> {
    const change = this.photoChange();
    if (change.kind !== 'keep') {
      await this.store.setItemPhoto(itemId, change.kind === 'set' ? change.photo : null);
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

function validPrice({ value }: { value: () => number | null }) {
  const price = value();
  return price === null || ShekelsSchema.safeParse(price).success ? null : { kind: 'price' };
}

function variationInput(model: VariationModel): ItemVariationInput {
  return {
    ...(model.id === null ? {} : { id: model.id }),
    name: textOf(model.nameHe, model.nameEn),
    price: model.price === null ? null : { value: model.price, currency: 'ILS' },
    tagIds: model.tags,
    available: model.available,
  };
}

function textOf(he: string, en: string): Text {
  return { he: he.trim(), en: en.trim() || null };
}
