import { formatDistance, formatRelativeDate, formatShekels } from './format';

describe('formatShekels', () => {
  it('shows whole shekels', () => {
    expect(formatShekels(6800)).toBe('₪68');
  });

  it('rounds agorot to the nearest shekel', () => {
    expect(formatShekels(6850)).toBe('₪69');
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
