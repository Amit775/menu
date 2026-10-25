import {
  formatDistance,
  formatMonth,
  formatPrice,
  formatRelativeDate,
  formatShekels,
} from './format';

describe('formatPrice', () => {
  it('shows whole shekels without decimals', () => {
    expect(formatPrice({ value: 68, currency: 'ILS' as const })).toBe('₪68');
  });

  it('shows a price with agorot with two decimals', () => {
    expect(formatPrice({ value: 68.5, currency: 'ILS' as const })).toBe('₪68.50');
    expect(formatShekels(0.07)).toBe('₪0.07');
  });
});

describe('formatDistance', () => {
  it('uses metres below one kilometre', () => {
    expect(formatDistance(350, 'he')).toBe('350 מ׳');
    expect(formatDistance(350, 'en')).toBe('350 m');
  });

  it('uses kilometres with one decimal', () => {
    expect(formatDistance(1234, 'he')).toBe('1.2 ק״מ');
    expect(formatDistance(1234, 'en')).toBe('1.2 km');
  });
});

describe('formatRelativeDate', () => {
  const now = new Date('2026-10-23T12:00:00.000Z');

  it('says yesterday in the current language', () => {
    expect(formatRelativeDate('2026-10-22T12:00:00.000Z', 'en', now)).toBe('yesterday');
    expect(formatRelativeDate('2026-10-22T12:00:00.000Z', 'he', now)).toBe('אתמול');
  });

  it('counts weeks after a week', () => {
    expect(formatRelativeDate('2026-10-09T12:00:00.000Z', 'en', now)).toBe('2 weeks ago');
  });
});

describe('formatMonth', () => {
  it('names the month in the given language', () => {
    expect(formatMonth('2026-03', 'en')).toBe('Mar');
  });
});
