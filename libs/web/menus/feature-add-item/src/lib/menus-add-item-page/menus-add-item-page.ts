import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
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
import { AddItemStore } from '@menu/web/menus/data-access';
import { ShekelsSchema, type Text } from '@menu/shared/contracts';
import { I18n, injectTranslate, LocalizePipe } from '@menu/web/shared/util-i18n';
import { addItemI18n } from '../add-item.i18n';

const notBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim() === ''
    ? { required: true }
    : Validators.required(control);

@Component({
  selector: 'menu-menus-add-item-page',
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
  templateUrl: './menus-add-item-page.html',
  styleUrl: './menus-add-item-page.scss',
  providers: [AddItemStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenusAddItemPage {
  protected readonly store = inject(AddItemStore);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly i18n = inject(I18n);
  protected readonly t = injectTranslate(addItemI18n);

  readonly id = input.required<string>();

  protected readonly name = new FormControl('', {
    nonNullable: true,
    validators: [notBlank, Validators.maxLength(200)],
  });
  protected readonly section = new FormControl<string | null>(null, (control) =>
    Validators.required(control),
  );
  protected readonly price = new FormControl<number | null>(null, (control) =>
    control.value === null || ShekelsSchema.safeParse(control.value).success
      ? null
      : { price: true },
  );
  protected readonly form = new FormGroup({
    name: this.name,
    section: this.section,
    price: this.price,
  });

  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    this.store.load(this.id);
  }

  protected cancel(): void {
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
    } else {
      void this.router.navigate(['/venues', this.id()]);
    }
  }

  protected retry(): void {
    this.store.reload();
  }

  protected async save(): Promise<void> {
    const sectionId = this.section.value;
    if (this.form.invalid || sectionId === null || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.failed.set(false);
    try {
      const item = await this.store.add({
        sectionId,
        name: this.localizedName(),
        listPrice: this.price.value === null ? null : { value: this.price.value, currency: 'ILS' },
      });
      void this.router.navigate(['/log', item.id], { replaceUrl: true });
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  /** Every name needs Hebrew; one typed in English stands in for it until someone translates it. */
  private localizedName(): Text {
    const name = this.name.value.trim();
    return { he: name, en: this.i18n.language() === 'en' ? name : null };
  }
}
