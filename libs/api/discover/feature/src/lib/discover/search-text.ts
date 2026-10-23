const FINAL_LETTERS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

/**
 * Folds text for matching: niqqud and cantillation marks, geresh and gershayim
 * (and their ASCII stand-ins), hyphens and final letters are ignored, and case
 * and spacing do not matter. So "צ'יפס", "צ׳יפס" and "ציפס" all match.
 */
export function foldForSearch(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[֑-ׇ]/g, '')
    .replace(/[׳״'"`’”-]/g, '')
    .replace(/[ךםןףץ]/g, (letter) => FINAL_LETTERS[letter] ?? letter)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
