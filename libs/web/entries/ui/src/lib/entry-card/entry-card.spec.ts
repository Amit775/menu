import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { type Entry, type PublicEntry } from '@menu/shared/contracts';
import { I18n } from '@menu/web/shared/util-i18n';
import { EntryCard } from './entry-card';

describe('EntryCard', () => {
  const now = Date.now();
  const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const own: Entry = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    itemId: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
    variationId: null,
    venueId: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10',
    eatenAt: yesterday,
    rating: 5,
    wouldOrderAgain: true,
    pricePaid: { value: 68, currency: 'ILS' as const },
    text: 'מדיום מושלם',
    visibility: 'private',
    shareToken: null,
    hidden: false,
    photoUrl: null,
    createdAt: yesterday,
    updatedAt: yesterday,
  };
  const others: PublicEntry = {
    id: own.id,
    itemId: own.itemId,
    variationId: null,
    venueId: own.venueId,
    eatenAt: yesterday,
    rating: null,
    wouldOrderAgain: false,
    pricePaid: null,
    text: '',
    authorName: 'דנה',
    photoUrl: null,
    createdAt: yesterday,
  };

  @Component({
    imports: [EntryCard],
    template: `<menu-entry-card [entry]="entry()"
      ><button type="button">עריכה</button></menu-entry-card
    >`,
  })
  class Host {
    readonly entry = input.required<Entry | PublicEntry>();
  }

  async function render(entry: Entry | PublicEntry): Promise<HTMLElement> {
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(Host);
    fixture.componentRef.setInput('entry', entry);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('names the variation the diner had when the item still lists it', async () => {
    const vegan = '6b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(EntryCard);
    fixture.componentRef.setInput('entry', { ...own, variationId: vegan });
    fixture.componentRef.setInput('variations', [{ id: vegan, name: { he: 'טבעוני', en: null } }]);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.facts .variation')?.textContent).toBe('טבעוני');
    fixture.componentRef.setInput('variations', []);
    await fixture.whenStable();
    expect(element.querySelector('.facts .variation')).toBeNull();
  });

  it('marks the user’s own entry with its visibility and shows what they noted', async () => {
    const element = await render(own);
    const card = element.querySelector('menu-entry-card');
    expect(card?.classList).toContain('private');
    expect(element.querySelector('.who')?.textContent.trim()).toBe('הרשומה שלך · פרטית');
    expect(element.querySelector('.facts')?.textContent).toContain('★ 5');
    expect(element.querySelector('.facts')?.textContent).toContain('יזמין שוב');
    const spoken = [...element.querySelectorAll('.facts .visually-hidden')].map(
      (span) => span.textContent,
    );
    expect(spoken).toEqual(['דירוג 5 מתוך 5', 'שולם ₪68']);
    expect(element.querySelector('.facts [aria-label]')).toBeNull();
    expect(element.querySelector('time')?.textContent).toBe('אתמול');
    expect(element.querySelector('.text')?.textContent).toBe('מדיום מושלם');
    expect(element.querySelector('.actions button')?.textContent).toBe('עריכה');
  });

  it('names the author of someone else’s entry and leaves out what they skipped', async () => {
    const element = await render(others);
    expect(element.querySelector('menu-entry-card')?.classList).not.toContain('own');
    expect(element.querySelector('.who')?.textContent).toBe('דנה');
    expect(element.querySelector('.facts')?.textContent).not.toContain('★');
    expect(element.querySelector('.facts')?.textContent).toContain('לא יזמין שוב');
    expect(element.querySelector('.text')).toBeNull();
  });

  it('tells the author when an Admin hid their entry', async () => {
    const element = await render({ ...own, hidden: true, visibility: 'public' });
    expect(element.querySelector('menu-entry-card')?.classList).not.toContain('private');
    expect(element.querySelector('[role="note"]')?.textContent).toContain('הוסתרה');
  });

  it('falls back to a neutral name when the author has none', async () => {
    const element = await render({ ...others, authorName: '' });
    expect(element.querySelector('.who')?.textContent).toBe('משתמש');
  });

  it('shows the entry’s photo, and nothing in its place without one', async () => {
    expect((await render(others)).querySelector('.photo')).toBeNull();
    TestBed.resetTestingModule();
    const element = await render({ ...others, photoUrl: '/api/photos/pppppppppppppppppppppp' });
    const img = element.querySelector('.photo img');
    expect(img?.getAttribute('src')).toBe('/api/photos/pppppppppppppppppppppp');
    expect(img?.getAttribute('alt')).toBe('תמונה מהרשומה');
  });
});
