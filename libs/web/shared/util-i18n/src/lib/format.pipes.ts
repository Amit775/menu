import { inject, Pipe, type PipeTransform } from '@angular/core';
import { type Price } from '@menu/shared/contracts';
import {
  formatDistance,
  formatMonthYear,
  formatPrice,
  formatRelativeDate,
  formatShekels,
} from './format';
import { I18n } from './i18n';

@Pipe({ name: 'shekels' })
export class ShekelsPipe implements PipeTransform {
  transform(value: number): string {
    return formatShekels(value);
  }
}

@Pipe({ name: 'price' })
export class PricePipe implements PipeTransform {
  transform(price: Price): string {
    return formatPrice(price);
  }
}

/** `{{ meters | distance }}` in the current language; impure so it follows a language switch. */
@Pipe({ name: 'distance', pure: false })
export class DistancePipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(meters: number): string {
    return formatDistance(meters, this.i18n.language());
  }
}

@Pipe({ name: 'relativeDate', pure: false })
export class RelativeDatePipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(iso: string): string {
    return formatRelativeDate(iso, this.i18n.language());
  }
}

@Pipe({ name: 'monthYear', pure: false })
export class MonthYearPipe implements PipeTransform {
  private readonly i18n = inject(I18n);

  transform(iso: string): string {
    return formatMonthYear(iso, this.i18n.language());
  }
}
