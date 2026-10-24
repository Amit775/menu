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
import { toSignal } from '@angular/core/rxjs-interop';
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
import {
  type GeoPoint,
  type LocalizedText,
  type Venue,
  type VenueStatus,
} from '@menu/shared/contracts';
import { ManagedVenuesStore, VenueManagerStore } from '@menu/web/menus/data-access';
import { injectMessages } from '@menu/web/shared/util-i18n';
import { venueFormMessages } from '../venue-form.messages';
import { PinPicker } from './pin-picker';

/** Required, and more than spaces: the API trims names and addresses. */
const notBlank: ValidatorFn = (control) =>
  typeof control.value === 'string' && control.value.trim() === ''
    ? { required: true }
    : Validators.required(control);

/** The contract's phone rule (`VenueSchema`). */
const phonePattern = Validators.pattern(/^\s*\+?[0-9 -]{6,20}\s*$/);

/** An http(s) link, like the contract's `reservationUrl`. */
const webLink: ValidatorFn = (control) => {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  if (value === '') {
    return null;
  }
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:' ? null : { url: true };
  } catch {
    return { url: true };
  }
};

const MAX_SECTIONS = 30;

const sectionLines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

/**
 * J7 (Admin): create a venue (`/manage/venues/new`) or edit one
 * (`/manage/venues/:id/edit`): names, address, a pin on the map, phone,
 * reservation link and, when editing, whether it is hidden.
 */
@Component({
  selector: 'menu-venue-form-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    PinPicker,
  ],
  templateUrl: './venue-form-page.html',
  styleUrl: './venue-form-page.scss',
  providers: [VenueManagerStore, ManagedVenuesStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueFormPage {
  /** The venue's `:id` when editing; absent on `venues/new`. */
  readonly id = input<string>();

  protected readonly store = inject(VenueManagerStore);
  private readonly venues = inject(ManagedVenuesStore);
  private readonly router = inject(Router);
  protected readonly t = injectMessages(venueFormMessages);

  protected readonly nameHe = new FormControl('', {
    nonNullable: true,
    validators: [notBlank, Validators.maxLength(200)],
  });
  protected readonly nameEn = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(200)],
  });
  protected readonly address = new FormControl('', {
    nonNullable: true,
    validators: [notBlank, Validators.maxLength(200)],
  });
  protected readonly lat = new FormControl<number | null>(null, [
    Validators.required.bind(Validators),
    Validators.min(-90),
    Validators.max(90),
  ]);
  protected readonly lng = new FormControl<number | null>(null, [
    Validators.required.bind(Validators),
    Validators.min(-180),
    Validators.max(180),
  ]);
  protected readonly phone = new FormControl('', { nonNullable: true, validators: [phonePattern] });
  protected readonly reservationUrl = new FormControl('', {
    nonNullable: true,
    validators: [webLink],
  });
  protected readonly status = new FormControl<VenueStatus>('active', { nonNullable: true });
  protected readonly sections = new FormControl('', {
    nonNullable: true,
    validators: [
      (control) =>
        sectionLines(String(control.value)).length > MAX_SECTIONS ? { tooMany: true } : null,
    ],
  });
  protected readonly form = new FormGroup({
    nameHe: this.nameHe,
    nameEn: this.nameEn,
    address: this.address,
    lat: this.lat,
    lng: this.lng,
    phone: this.phone,
    reservationUrl: this.reservationUrl,
    status: this.status,
    sections: this.sections,
  });

  private readonly coordinates = toSignal(this.form.valueChanges, {
    initialValue: this.form.value,
  });
  protected readonly point = computed<GeoPoint | null>(() => {
    const { lat, lng } = this.coordinates();
    return typeof lat === 'number' && typeof lng === 'number' && this.lat.valid && this.lng.valid
      ? { lat, lng }
      : null;
  });

  protected readonly editing = computed(() => this.id() !== undefined);
  /** Ready to show the form: always for a new venue, once loaded when editing. */
  protected readonly state = computed(() => (this.editing() ? this.store.status() : 'loaded'));
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      const id = this.id();
      if (id !== undefined) {
        untracked(() => void this.store.load(id));
      }
    });
    effect(() => {
      const venue = this.store.venue();
      if (venue) {
        untracked(() => {
          this.fill(venue);
        });
      }
    });
  }

  protected place(point: GeoPoint): void {
    this.lat.setValue(point.lat);
    this.lng.setValue(point.lng);
    this.lat.markAsDirty();
    this.lng.markAsDirty();
  }

  protected retry(): void {
    const id = this.id();
    if (id !== undefined) {
      void this.store.load(id);
    }
  }

  protected async save(): Promise<void> {
    const location = this.point();
    if (this.form.invalid || !location || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.failed.set(false);
    const details = {
      name: this.localizedName(),
      address: this.address.value.trim(),
      location,
      phone: this.phone.value.trim() || null,
      reservationUrl: this.reservationUrl.value.trim() || null,
    };
    try {
      const venue = this.editing()
        ? await this.store.updateVenue({ ...details, status: this.status.value })
        : await this.venues.create({
            ...details,
            sections: sectionLines(this.sections.value).map((he) => ({ he })),
          });
      void this.router.navigate(['/manage/venues', venue.id], { replaceUrl: true });
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  private fill(venue: Venue): void {
    this.form.reset({
      nameHe: venue.name.he,
      nameEn: venue.name.en ?? '',
      address: venue.address,
      lat: venue.location.lat,
      lng: venue.location.lng,
      phone: venue.phone ?? '',
      reservationUrl: venue.reservationUrl ?? '',
      status: venue.status,
      sections: '',
    });
  }

  private localizedName(): LocalizedText {
    const he = this.nameHe.value.trim();
    const en = this.nameEn.value.trim();
    return en ? { he, en } : { he };
  }
}
