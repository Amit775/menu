import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { type Entry, type ItemEntries } from '@menu/shared/contracts';
import { EntryApiClient } from '@menu/web/entries/data-access';
import { DeviceShare } from '@menu/web/shared/util-device';
import { I18n } from '@menu/web/shared/util-i18n';
import { EntriesSheetPage } from './entries-sheet-page';

const ITEM_ID = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
const VENUE_ID = '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10';
const mine: Entry = {
  id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  itemId: ITEM_ID,
  venueId: VENUE_ID,
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
};
const sheet: ItemEntries = {
  item: {
    id: ITEM_ID,
    name: { he: 'המבורגר הקלאסי' },
    listPrice: 6800,
    venue: { id: VENUE_ID, name: { he: 'בורגר 24' } },
  },
  mine: [mine],
  others: [
    {
      id: '1e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
      itemId: ITEM_ID,
      venueId: VENUE_ID,
      eatenAt: '2026-10-19T19:30:00.000Z',
      rating: 4,
      wouldOrderAgain: null,
      pricePaid: null,
      text: 'טוב מאוד',
      authorName: 'דנה',
      createdAt: '2026-10-19T20:00:00.000Z',
    },
  ],
};

describe('EntriesSheetPage', () => {
  async function open(api: Partial<EntryApiClient>, share = vi.fn()) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'items/:id/entries', component: EntriesSheetPage },
            { path: '**', children: [] },
          ],
          withComponentInputBinding(),
        ),
        {
          provide: EntryApiClient,
          useValue: { forItem: vi.fn().mockResolvedValue(sheet), ...api },
        },
        { provide: DeviceShare, useValue: { share } },
      ],
    });
    TestBed.inject(I18n).setLanguage('he');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/items/${ITEM_ID}/entries`, EntriesSheetPage);
    await harness.fixture.whenStable();
    const element = harness.routeNativeElement;
    if (!element) {
      throw new Error('The page did not render.');
    }
    await vi.waitFor(() => {
      harness.detectChanges();
      expect(element.querySelector('mat-spinner')).toBeNull();
    });
    return { harness, element };
  }

  it('puts the user’s entries on top, then everyone’s, with a way to log again', async () => {
    const { element } = await open({});
    expect(element.querySelector('h1')?.textContent).toBe('מה אומרים · אחת ציבורית');
    expect(element.querySelector('.mine .who')?.textContent).toContain('הרשומה שלך · פרטית');
    expect(element.querySelector('.others .who')?.textContent).toBe('דנה');
    expect(element.querySelector('.mine a')?.getAttribute('href')).toBe(
      `/log/${ITEM_ID}/${mine.id}`,
    );
    const log = element.querySelector('a.log');
    expect(log?.textContent).toContain('אכלתי את זה שוב');
    expect(log?.getAttribute('href')).toBe(`/log/${ITEM_ID}`);
  });

  it('makes a private entry public in place', async () => {
    const update = vi.fn().mockResolvedValue({
      ...mine,
      visibility: 'public',
      shareToken: 'abcdefghijklmnopqrstuv',
    });
    const { harness, element } = await open({ update });
    element.querySelector<HTMLButtonElement>('.mine button')?.click();
    await harness.fixture.whenStable();
    expect(update).toHaveBeenCalledWith(mine.id, { visibility: 'public' });
    expect(element.querySelector('.mine .who')?.textContent).toContain('ציבורית');
    expect(element.querySelector('.mine button')?.textContent.trim()).toBe('שיתוף');
  });

  it('says so when the change fails', async () => {
    const { harness, element } = await open({ update: vi.fn().mockRejectedValue(new Error('x')) });
    element.querySelector<HTMLButtonElement>('.mine button')?.click();
    await harness.fixture.whenStable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('השינוי לא נשמר');
  });

  it('shares the link of a shared entry', async () => {
    const shared = { ...mine, visibility: 'shared' as const, shareToken: 'abcdefghijklmnopqrstuv' };
    const share = vi.fn().mockResolvedValue('copied');
    const { harness, element } = await open(
      { forItem: vi.fn().mockResolvedValue({ ...sheet, mine: [shared] }) },
      share,
    );
    element.querySelector<HTMLButtonElement>('.mine button')?.click();
    await harness.fixture.whenStable();
    expect(share).toHaveBeenCalledWith('/e/abcdefghijklmnopqrstuv', 'המבורגר הקלאסי');
    expect(element.querySelector('[role="status"]')?.textContent).toBe('הקישור הועתק');
  });

  it('invites a first entry when there is nothing yet', async () => {
    const { element } = await open({
      forItem: vi.fn().mockResolvedValue({ ...sheet, mine: [], others: [] }),
    });
    expect(element.querySelector('.mine')).toBeNull();
    expect(element.querySelector('.empty')?.textContent).toContain('עוד אין רשומות');
    expect(element.querySelector('a.log')?.textContent).toContain('אכלתי את זה · רשומה חדשה');
  });

  it('closes to the item page when opened directly', async () => {
    const { harness, element } = await open({});
    element.querySelector<HTMLButtonElement>('header button')?.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe(`/items/${ITEM_ID}`);
  });

  it('offers to try again when loading fails', async () => {
    const forItem = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(sheet);
    const { harness, element } = await open({ forItem });
    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    await harness.fixture.whenStable();
    expect(forItem).toHaveBeenCalledTimes(2);
  });
});
