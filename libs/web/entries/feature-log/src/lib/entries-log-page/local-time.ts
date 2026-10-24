/** `2026-10-23T20:40` in the device's time zone, for `<input type="datetime-local">`. */
export function toLocalInput(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The input's local time as an ISO instant, or null when it is empty or not a date. */
export function fromLocalInput(value: string): string | null {
  const date = new Date(value);
  return value === '' || Number.isNaN(date.getTime()) ? null : date.toISOString();
}
