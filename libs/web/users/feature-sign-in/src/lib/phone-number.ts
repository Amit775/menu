export function toE164(input: string): string | null {
  const compact = input.replace(/[\s\-().]/g, '');
  const international = compact.startsWith('+')
    ? compact
    : compact.startsWith('0')
      ? `+972${compact.slice(1)}`
      : null;
  return international && /^\+\d{8,15}$/.test(international) ? international : null;
}

/** Only paths inside the app, so a crafted link cannot send people elsewhere after sign-in. */
export function safeReturnUrl(url: string | undefined): string {
  return url?.startsWith('/') && !url.startsWith('//') ? url : '/profile';
}
