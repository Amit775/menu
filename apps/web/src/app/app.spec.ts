import { DOCUMENT } from '@angular/common';
import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Roles } from '@menu/web/shared/util-auth';
import { I18n } from '@menu/web/shared/util-i18n';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the navigation in Hebrew, right to left', async () => {
    const element = await render();
    const links = [...element.querySelectorAll('nav a')].map((a) => a.textContent.trim());
    expect(links).toEqual(['view_carousel גילוי', 'person פרופיל']);
    expect(TestBed.inject(DOCUMENT).documentElement.dir).toBe('rtl');
  });

  it('adds a tab for Owners and Admins', async () => {
    const element = await render();
    TestBed.inject(Roles).set({ isAdmin: false, ownedVenueIds: ['v1'] });
    TestBed.tick();
    const manage = element.querySelectorAll('nav a')[2];
    expect(manage?.textContent).toContain('המקומות שלי');
    expect(manage?.getAttribute('href')).toBe('/manage');
  });

  it('switches the navigation to English', async () => {
    const element = await render();
    TestBed.inject(I18n).setLanguage('en');
    await TestBed.inject(ApplicationRef).whenStable();
    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Navigation');
    expect(TestBed.inject(DOCUMENT).documentElement.dir).toBe('ltr');
  });
});
