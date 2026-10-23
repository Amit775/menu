import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
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
import { AddItemStore } from '@menu/web/menus/data-access';
import { injectMessages, LocalizePipe } from '@menu/web/shared/util-i18n';
import { addItemMessages } from '../add-item.messages';

/** Required, and more than spaces: the API trims the name. */
const notBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim() === ''
    ? { required: true }
    : Validators.required(control);

/**
 * J4: "not on the menu?" (`/venues/:id/add-item`). A short form (name, section,
 * price) creates an item only its submitter sees until the venue approves it,
 * then opens the log form for it.
 */
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
  protected readonly t = injectMessages(addItemMessages);

  /** The venue's `:id` route parameter. */
  readonly id = input.required<string>();

  protected readonly name = new FormControl('', {
    nonNullable: true,
    validators: [notBlank, Validators.maxLength(200)],
  });
  protected readonly section = new FormControl<string | null>(null, (control) =>
    Validators.required(control),
  );
  protected readonly price = new FormControl<number | null>(null, [
    Validators.min(0),
    Validators.max(100_000),
    Validators.pattern(/^\d+$/),
  ]);
  protected readonly form = new FormGroup({
    name: this.name,
    section: this.section,
    price: this.price,
  });

  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => void this.store.load(id));
    });
  }

  protected cancel(): void {
    if (this.router.lastSuccessfulNavigation()?.previousNavigation) {
      this.location.back();
    } else {
      void this.router.navigate(['/venues', this.id()]);
    }
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
    try {
      const item = await this.store.add({
        sectionId,
        name: { he: this.name.value.trim() },
        listPrice: this.price.value === null ? null : this.price.value * 100,
      });
      void this.router.navigate(['/log', item.id], { replaceUrl: true });
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }
}
