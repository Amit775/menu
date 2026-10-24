import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18n } from './i18n';
import { i18nScope, injectTranslate } from './translate';

const he = { title: 'שלום', count: '{count, plural, =1 {רשומה אחת} other {# רשומות}}' };
const en: typeof he = { title: 'Hello', count: '{count, plural, =1 {1 entry} other {# entries}}' };
const scope = i18nScope('greeting', {
  he: () => Promise.resolve(he),
  en: () => Promise.resolve(en),
});

@Component({
  selector: 'menu-greeting',
  template: `<h1>{{ t('title') }}</h1>
    <p>{{ t('count', { count: 3 }) }}</p>`,
})
class Greeting {
  protected readonly t = injectTranslate(scope);
}

describe('injectTranslate', () => {
  async function render() {
    const fixture = TestBed.createComponent(Greeting);
    await TestBed.inject(ApplicationRef).whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the scope’s strings once they load, with plurals', async () => {
    TestBed.inject(I18n).setLanguage('he');
    const element = await render();
    expect(element.querySelector('h1')?.textContent).toBe('שלום');
    expect(element.querySelector('p')?.textContent).toBe('3 רשומות');
  });

  it('follows a language switch', async () => {
    TestBed.inject(I18n).setLanguage('he');
    const element = await render();
    TestBed.inject(I18n).setLanguage('en');
    await TestBed.inject(ApplicationRef).whenStable();
    await vi.waitFor(() => {
      TestBed.tick();
      expect(element.querySelector('h1')?.textContent).toBe('Hello');
    });
    expect(element.querySelector('p')?.textContent).toBe('3 entries');
  });
});
