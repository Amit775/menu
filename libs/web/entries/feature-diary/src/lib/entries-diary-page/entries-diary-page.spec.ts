import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type EntryWithItem } from '@menu/shared/contracts';
import { EntryApiClient } from '@menu/web/entries/data-access';
import { I18n } from '@menu/web/shared/util-i18n';
import { EntriesDiaryPage } from './entries-diary-page';

const line: EntryWithItem = {
  id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  itemId: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
  venueId: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10',
  eatenAt: '2026-10-20T19:30:00.000Z',
  rating: 5,
  wouldOrderAgain: true,
  pricePaid: 6800,
  text: 'מדיום מושלם',
  visibility: 'private',
  shareToken: null,
  hidden: false,
  createdAt: '2026-10-20T20:00:00.000Z',
  updatedAt: '2026-10-20T20:00:00.000Z',
  item: {
    id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10',
    name: { he: 'המבורגר הקלאסי' },
    listPrice: 6800,
    venue: { id: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10', name: { he: 'בורגר 24' } },
  },
};

describe('EntriesDiaryPage', () => {
  async function render(diary: EntryApiClient['diary']): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: EntryApiClient, useValue: { diary } }],
    });
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(EntriesDiaryPage);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('lists every entry with its item and venue, linked to the item and to editing', async () => {
    const element = await render(vi.fn().mockResolvedValue([line]));
    expect(element.querySelector('.count')?.textContent).toBe('רשומה אחת');
    const item = element.querySelector('a.item');
    expect(item?.getAttribute('href')).toBe(`/items/${line.item.id}/entries`);
    expect(item?.textContent).toContain('המבורגר הקלאסי');
    expect(item?.textContent).toContain('בורגר 24');
    expect(element.querySelector('menu-entry-card .who')?.textContent).toContain('פרטית');
    expect(element.querySelector('menu-entry-card a')?.getAttribute('href')).toBe(
      `/log/${line.item.id}/${line.id}`,
    );
  });

  it('points an empty diary at discover', async () => {
    const element = await render(vi.fn().mockResolvedValue([]));
    expect(element.querySelector('.state')?.textContent).toContain('היומן עוד ריק');
    expect(element.querySelector('.state a')?.getAttribute('href')).toBe('/');
  });

  it('offers to try again when loading fails', async () => {
    const diary = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([line]);
    const element = await render(diary);
    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    await vi.waitFor(() => {
      expect(diary).toHaveBeenCalledTimes(2);
    });
  });
});
