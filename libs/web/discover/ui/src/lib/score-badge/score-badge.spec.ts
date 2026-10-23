import { TestBed } from '@angular/core/testing';
import { I18n } from '@menu/web/shared/util-i18n';
import { ScoreBadge } from './score-badge';

describe('ScoreBadge', () => {
  async function render(score: number | null, count = 0): Promise<HTMLElement> {
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(ScoreBadge);
    fixture.componentRef.setInput('score', score);
    fixture.componentRef.setInput('count', count);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the score with one decimal and the entry count', async () => {
    const element = await render(4.567, 12);
    expect(element.querySelector('.score')?.textContent.trim()).toBe('4.6');
    expect(element.querySelector('.count')?.textContent).toBe('12 רשומות');
  });

  it('shows no number below the floor', async () => {
    const element = await render(null, 2);
    expect(element.querySelector('.score')?.getAttribute('aria-label')).toBe('אין עדיין ציון');
  });
});
