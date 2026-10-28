import { type Language, type Price } from '@menu/shared/contracts';

export function formatShekels(value: number): string {
  return `₪${Number.isInteger(value) ? String(value) : value.toFixed(2)}`;
}

export function formatPrice(price: Price): string {
  return formatShekels(price.value);
}

export function formatDistance(meters: number, language: Language): string {
  if (meters < 1000) {
    return `${String(Math.round(meters))} ${language === 'he' ? 'מ׳' : 'm'}`;
  }
  return `${(meters / 1000).toFixed(1)} ${language === 'he' ? 'ק״מ' : 'km'}`;
}

const DAY = 24 * 60 * 60 * 1000;

export function formatRelativeDate(iso: string, language: Language, now = new Date()): string {
  const days = Math.round((new Date(iso).getTime() - now.getTime()) / DAY);
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  if (Math.abs(days) < 7) {
    return format.format(days, 'day');
  }
  if (Math.abs(days) < 30) {
    return format.format(Math.round(days / 7), 'week');
  }
  if (Math.abs(days) < 365) {
    return format.format(Math.round(days / 30), 'month');
  }
  return format.format(Math.round(days / 365), 'year');
}

/** Months follow the diners' calendar, not UTC. */
export function formatMonthYear(iso: string, language: Language): string {
  return new Intl.DateTimeFormat(language, {
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jerusalem',
  }).format(new Date(iso));
}

export function formatList(items: readonly string[], language: Language): string {
  return new Intl.ListFormat(language, { type: 'conjunction' }).format(items);
}
