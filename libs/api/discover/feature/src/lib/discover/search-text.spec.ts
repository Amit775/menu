import { foldForSearch } from './search-text';

describe('foldForSearch', () => {
  it('matches a word typed without geresh', () => {
    expect(foldForSearch('צ׳יפס')).toBe(foldForSearch('ציפס'));
    expect(foldForSearch("צ'יפס")).toBe(foldForSearch('ציפס'));
  });

  it('ignores niqqud', () => {
    expect(foldForSearch('שָׁלוֹם')).toBe('שלומ');
  });

  it('treats final letters like their regular form, so a prefix still matches', () => {
    expect(foldForSearch('המבורגרים').includes(foldForSearch('המבורגרי'))).toBe(true);
    expect(foldForSearch('לחם')).toBe('לחמ');
  });

  it('ignores case and extra spaces', () => {
    expect(foldForSearch('  Fish   AND chips ')).toBe('fish and chips');
  });
});
