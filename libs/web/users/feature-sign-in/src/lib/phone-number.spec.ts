import { safeReturnUrl, toE164 } from './phone-number';

describe('toE164', () => {
  it('reads an Israeli mobile number however it is typed', () => {
    expect(toE164('050-123 4567')).toBe('+972501234567');
    expect(toE164('+972 50 123 4567')).toBe('+972501234567');
  });

  it('refuses something that is not a phone number', () => {
    expect(toE164('hello')).toBeNull();
    expect(toE164('0')).toBeNull();
  });
});

describe('safeReturnUrl', () => {
  it('keeps a path inside the app', () => {
    expect(safeReturnUrl('/items/1')).toBe('/items/1');
  });

  it('ignores a link to another site', () => {
    expect(safeReturnUrl('//evil.example')).toBe('/profile');
    expect(safeReturnUrl('https://evil.example')).toBe('/profile');
    expect(safeReturnUrl(undefined)).toBe('/profile');
  });
});
