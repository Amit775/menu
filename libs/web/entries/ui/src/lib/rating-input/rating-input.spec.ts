import { TestBed } from '@angular/core/testing';
import { I18n } from '@menu/web/shared/util-i18n';
import { RatingInput } from './rating-input';

describe('RatingInput', () => {
  async function render(value: number | null = null) {
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(RatingInput);
    fixture.componentRef.setInput('value', value);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const radios = [...element.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
    return { fixture, element, radios };
  }

  it('offers five labelled stars in one group', async () => {
    const { element, radios } = await render();
    expect(radios).toHaveLength(5);
    expect(new Set(radios.map((radio) => radio.name)).size).toBe(1);
    expect(element.querySelector('legend')?.textContent).toContain('דירוג');
    expect(element.querySelectorAll('label')[3]?.textContent).toContain('4 כוכבים');
  });

  it('sets the rating and lights the stars up to it', async () => {
    const { fixture, element, radios } = await render();
    radios[3]?.dispatchEvent(new MouseEvent('click', { detail: 1 }));
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe(4);
    expect(element.querySelectorAll('label.on')).toHaveLength(4);
  });

  it('clears the rating when the chosen star is clicked again', async () => {
    const { fixture, radios } = await render(4);
    radios[3]?.dispatchEvent(new MouseEvent('click', { detail: 1 }));
    expect(fixture.componentInstance.value()).toBeNull();
  });

  it('offers a button to clear the rating, for keyboards too', async () => {
    const { fixture, element } = await render(4);
    const clear = element.querySelector<HTMLButtonElement>('button.clear');
    expect(clear?.textContent.trim()).toBe('ניקוי הדירוג');
    clear?.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBeNull();
    expect(element.querySelector('button.clear')).toBeNull();
  });

  it('keeps the rating when the keyboard selects it', async () => {
    const { fixture, radios } = await render(4);
    radios[3]?.dispatchEvent(new MouseEvent('click', { detail: 0 }));
    expect(fixture.componentInstance.value()).toBe(4);
  });
});
