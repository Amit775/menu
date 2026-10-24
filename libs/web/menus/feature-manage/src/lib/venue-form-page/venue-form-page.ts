import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import {
  form,
  FormField,
  max,
  maxLength,
  min,
  pattern,
  required,
  validate,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { type GeoPoint, type LocalizedText, type VenueStatus } from '@menu/shared/contracts';
import { VenueManagerStore } from '@menu/web/menus/data-access';
import { injectTranslate } from '@menu/web/shared/util-i18n';
import { venueFormI18n } from '../venue-form.i18n';
import { PinPicker } from './pin-picker';

interface VenueModel {
  nameHe: string;
  nameEn: string;
  address: string;
  lat: number | null;
  lng: number | null;
  phone: string;
  reservationUrl: string;
  status: VenueStatus;
  sections: string;
}

function isWebLink(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

const MAX_SECTIONS = 30;

const sectionLines = (text: string): string[] =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

@Component({
  selector: 'menu-venue-form-page',
  imports: [
    FormField,
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
  providers: [VenueManagerStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VenueFormPage {
  readonly id = input<string>();

  protected readonly store = inject(VenueManagerStore);
  private readonly router = inject(Router);
  protected readonly t = injectTranslate(venueFormI18n);

  protected readonly model = linkedSignal<VenueModel>(() => {
    const venue = this.store.venue();
    return {
      nameHe: venue?.name.he ?? '',
      nameEn: venue?.name.en ?? '',
      address: venue?.address ?? '',
      lat: venue?.location.lat ?? null,
      lng: venue?.location.lng ?? null,
      phone: venue?.phone ?? '',
      reservationUrl: venue?.reservationUrl ?? '',
      status: venue?.status ?? 'active',
      sections: '',
    };
  });

  protected readonly form = form(
    this.model,
    (path) => {
      for (const text of [path.nameHe, path.address]) {
        required(text);
        validate(text, ({ value }) => (value().trim() === '' ? { kind: 'required' } : null));
        maxLength(text, 200);
      }
      maxLength(path.nameEn, 200);
      required(path.lat);
      min(path.lat, -90);
      max(path.lat, 90);
      required(path.lng);
      min(path.lng, -180);
      max(path.lng, 180);
      pattern(path.phone, /^(\s*\+?[0-9 -]{6,20}\s*)?$/);
      validate(path.reservationUrl, ({ value }) => {
        const link = value().trim();
        return link === '' || isWebLink(link) ? null : { kind: 'url' };
      });
      validate(path.sections, ({ value }) =>
        sectionLines(value()).length > MAX_SECTIONS ? { kind: 'tooMany' } : null,
      );
    },
    { name: 'venue' },
  );

  protected readonly point = computed<GeoPoint | null>(() => {
    const { lat, lng } = this.model();
    return lat !== null && lng !== null && this.form.lat().valid() && this.form.lng().valid()
      ? { lat, lng }
      : null;
  });

  protected readonly editing = computed(() => this.id() !== undefined);
  protected readonly state = computed(() => (this.editing() ? this.store.status() : 'loaded'));
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    this.store.load(this.id);
  }

  protected place(point: GeoPoint): void {
    this.model.update((model) => ({ ...model, lat: point.lat, lng: point.lng }));
    this.form.lat().markAsDirty();
    this.form.lng().markAsDirty();
  }

  protected retry(): void {
    this.store.reload();
  }

  protected async save(): Promise<void> {
    const location = this.point();
    if (this.form().invalid() || !location || this.saving()) {
      this.form().markAsTouched();
      return;
    }
    this.saving.set(true);
    this.failed.set(false);
    const model = this.model();
    const details = {
      name: this.localizedName(model),
      address: model.address.trim(),
      location,
      phone: model.phone.trim() || null,
      reservationUrl: model.reservationUrl.trim() || null,
    };
    try {
      const venue = this.editing()
        ? await this.store.updateVenue({ ...details, status: model.status })
        : await this.store.createVenue({
            ...details,
            sections: sectionLines(model.sections).map((he) => ({ he })),
          });
      void this.router.navigate(['/manage/venues', venue.id], { replaceUrl: true });
    } catch {
      this.failed.set(true);
    } finally {
      this.saving.set(false);
    }
  }

  private localizedName(model: VenueModel): LocalizedText {
    const he = model.nameHe.trim();
    const en = model.nameEn.trim();
    return en ? { he, en } : { he };
  }
}
