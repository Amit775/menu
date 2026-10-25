import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  type ValidatorFn,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { type Text, type Tag, type TagKind, TagKindSchema } from '@menu/shared/contracts';
import { TagsStore } from '@menu/web/menus/data-access';
import { I18n, injectTranslate, LocalizePipe } from '@menu/web/shared/util-i18n';
import { tagsI18n } from '../tags.i18n';

const notBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim() === ''
    ? { required: true }
    : Validators.required(control);

function nameForm(tag?: Tag) {
  return new FormGroup({
    nameHe: new FormControl(tag?.name.he ?? '', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(80)],
    }),
    nameEn: new FormControl(tag?.name.en ?? '', {
      nonNullable: true,
      validators: [Validators.maxLength(80)],
    }),
    kind: new FormControl<TagKind>(tag?.kind ?? 'dish', { nonNullable: true }),
  });
}

@Component({
  selector: 'menu-tags-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    LocalizePipe,
  ],
  templateUrl: './tags-page.html',
  styleUrl: './tags-page.scss',
  providers: [TagsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagsPage {
  protected readonly store = inject(TagsStore);
  private readonly i18n = inject(I18n);
  protected readonly t = injectTranslate(tagsI18n);
  protected readonly kinds = TagKindSchema.options;
  protected readonly backIcon = computed(() =>
    this.i18n.dir() === 'rtl' ? 'arrow_forward' : 'arrow_back',
  );

  protected readonly groups = computed(() =>
    this.kinds.map((kind) => ({
      kind,
      tags: this.store.sorted().filter((tag) => tag.kind === kind),
    })),
  );

  protected readonly slug = new FormControl('', {
    nonNullable: true,
    validators: [
      Validators.required.bind(Validators),
      Validators.pattern(/^[a-z][a-z0-9-]{1,40}$/),
    ],
  });
  protected readonly addForm = new FormGroup({ slug: this.slug, ...nameForm().controls });
  protected readonly editing = signal<string | null>(null);
  protected editForm = nameForm();
  protected readonly merging = signal<string | null>(null);
  protected readonly mergeTarget = new FormControl<string | null>(null);

  protected readonly busy = signal(false);
  protected readonly failed = signal<'saveFailed' | 'slugTaken' | null>(null);

  protected retry(): void {
    this.store.reload();
  }

  protected others(tag: Tag): Tag[] {
    return this.store.sorted().filter((other) => other.id !== tag.id);
  }

  protected startEdit(tag: Tag): void {
    this.merging.set(null);
    this.editForm = nameForm(tag);
    this.editing.set(tag.id);
  }

  protected startMerge(tag: Tag): void {
    this.editing.set(null);
    this.mergeTarget.reset(null);
    this.merging.set(tag.id);
  }

  protected cancel(): void {
    this.editing.set(null);
    this.merging.set(null);
  }

  protected async add(): Promise<void> {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }
    const { kind } = this.addForm.getRawValue();
    const input = { slug: this.slug.value, name: this.named(this.addForm), kind };
    if (await this.run(() => this.store.add(input))) {
      this.addForm.reset();
    }
  }

  protected async save(tag: Tag): Promise<void> {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const input = { name: this.named(this.editForm), kind: this.editForm.getRawValue().kind };
    if (await this.run(() => this.store.update(tag.id, input))) {
      this.editing.set(null);
    }
  }

  protected async merge(tag: Tag): Promise<void> {
    const target = this.mergeTarget.value;
    if (target && (await this.run(() => this.store.merge(tag.id, target)))) {
      this.merging.set(null);
    }
  }

  private named(form: { getRawValue(): { nameHe: string; nameEn: string } }): Text {
    const { nameHe, nameEn } = form.getRawValue();
    return { he: nameHe.trim(), en: nameEn.trim() || null };
  }

  private async run(action: () => Promise<void>): Promise<boolean> {
    this.busy.set(true);
    this.failed.set(null);
    try {
      await action();
      return true;
    } catch (error) {
      this.failed.set(
        error instanceof HttpErrorResponse && error.status === 409 ? 'slugTaken' : 'saveFailed',
      );
      return false;
    } finally {
      this.busy.set(false);
    }
  }
}
