import { withoutUndefined } from './without-undefined';

describe('withoutUndefined', () => {
  it('drops undefined values and keeps null, false and empty strings', () => {
    expect(withoutUndefined({ a: undefined, b: null, c: false, d: '' })).toEqual({
      b: null,
      c: false,
      d: '',
    });
  });
});
