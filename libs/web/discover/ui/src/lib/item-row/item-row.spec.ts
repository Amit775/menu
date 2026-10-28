import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type DiscoverItem } from '@menu/shared/contracts';
import { I18n } from '@menu/web/shared/util-i18n';
import { ItemRow } from './item-row';

describe('ItemRow', () => {
  const item: DiscoverItem = {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'המבורגר הבית', en: 'House burger' },
    venue: { id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10', name: { he: 'מוזס', en: null } },
    sectionId: '5c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
    tagIds: [],
    distanceMeters: 350,
    score: 4.6,
    ratingCount: 12,
    wouldOrderAgainPercent: 92,
    latestPrice: { value: 68, currency: 'ILS' as const },
    photoUrl: null,
    writtenByMe: true,
    savedByMe: false,
  };

  async function render(value: DiscoverItem, showVenue = true): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(ItemRow);
    fixture.componentRef.setInput('item', value);
    fixture.componentRef.setInput('showVenue', showVenue);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('marks an item the caller wants to try', async () => {
    const element = await render({ ...item, savedByMe: true });
    expect(element.querySelector('mat-icon.saved')).not.toBeNull();
    expect(element.textContent).toContain('רוצה לנסות');
    expect(
      (await renderAgain({ ...item, savedByMe: false })).querySelector('mat-icon.saved'),
    ).toBeNull();
  });

  async function renderAgain(value: DiscoverItem): Promise<HTMLElement> {
    TestBed.resetTestingModule();
    return render(value);
  }

  it('shows the item, where it is and what it costs, linked to its page', async () => {
    const element = await render(item);
    const link = element.querySelector('a');
    expect(link?.getAttribute('href')).toBe(`/items/${item.id}`);
    expect(element.querySelector('.name')?.textContent).toContain('המבורגר הבית');
    expect(element.querySelector('.meta')?.textContent).toBe('מוזס350 מ׳₪68');
    expect(element.querySelector('.ratio')?.textContent).toBe('92% יזמינו שוב');
    expect(element.querySelector('.name .visually-hidden')?.textContent).toBe('יש לך רשומה');
  });

  it('invites the first entry on an item nobody rated, without the venue on its own page', async () => {
    const element = await render(
      {
        ...item,
        score: null,
        ratingCount: 0,
        wouldOrderAgainPercent: null,
        writtenByMe: false,
        savedByMe: false,
      },
      false,
    );
    expect(element.querySelector('.ratio')?.textContent).toBe('היו הראשונים');
    expect(element.querySelector('.meta')?.textContent).not.toContain('מוזס');
    expect(element.querySelector('.flag')).toBeNull();
  });

  it('shows a thumbnail of the newest public photo', async () => {
    const element = await render({ ...item, photoUrl: '/api/photos/pppppppppppppppppppppp' });
    expect(element.querySelector('.thumb img')?.getAttribute('src')).toBe(
      '/api/photos/pppppppppppppppppppppp',
    );
  });

  it('leaves the thumbnail out without a photo', async () => {
    expect((await render(item)).querySelector('.thumb')).toBeNull();
  });
});
