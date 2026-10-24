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

const broken = i18nScope('broken', {
  he: () => Promise.resolve(he),
  en: () => Promise.reject(new Error('chunk failed')),
});

@Component({
  selector: 'menu-broken',
  template: `<h1>{{ t('title') }}</h1>`,
})
class Broken {
  protected readonly t = injectTranslate(broken);
}

describe('injectTranslate when a scope fails to load', () => {
  it('keeps the last language that loaded', async () => {
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(Broken);
    await TestBed.inject(ApplicationRef).whenStable();
    const element = fixture.nativeElement as HTMLElement;
    TestBed.inject(I18n).setLanguage('en');
    await TestBed.inject(ApplicationRef).whenStable();
    TestBed.tick();
    expect(element.querySelector('h1')?.textContent).toBe('שלום');
  });
});

const missing = i18nScope('missing', {
  he: () => Promise.reject(new Error('chunk failed')),
  en: () => Promise.reject(new Error('chunk failed')),
});

@Component({
  selector: 'menu-missing',
  template: `<h1>{{ t('title') }}</h1>`,
})
class Missing {
  protected readonly t = injectTranslate(missing);
}

describe('injectTranslate when no language of a scope loads', () => {
  it('renders nothing instead of breaking the view', async () => {
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(Missing);
    await TestBed.inject(ApplicationRef).whenStable();
    expect(() => {
      TestBed.tick();
    }).not.toThrow();
    expect((fixture.nativeElement as HTMLElement).querySelector('h1')?.textContent).toBe('');
  });
});
