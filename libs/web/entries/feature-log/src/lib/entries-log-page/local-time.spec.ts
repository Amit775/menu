import { fromLocalInput, toLocalInput } from './local-time';

describe('local time for the date input', () => {
  it('writes a date as the input expects, in local time', () => {
    expect(toLocalInput(new Date(2026, 9, 3, 8, 5))).toBe('2026-10-03T08:05');
  });

  it('reads the input back as the same instant', () => {
    const date = new Date(2026, 9, 3, 8, 5);
    expect(fromLocalInput(toLocalInput(date))).toBe(date.toISOString());
  });

  it('reads an empty or broken value as no date', () => {
    expect(fromLocalInput('')).toBeNull();
    expect(fromLocalInput('yesterday')).toBeNull();
  });
});
