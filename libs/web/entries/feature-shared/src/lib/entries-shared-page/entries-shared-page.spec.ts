import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { type SharedEntryView } from '@menu/shared/contracts';
import { EntryApiClient } from '@menu/web/entries/data-access';
import { AUTH_BACKEND, FakeAuthBackend } from '@menu/web/shared/util-auth';
import { I18n } from '@menu/web/shared/util-i18n';
import { EntriesSharedPage } from './entries-shared-page';

const TOKEN = 'abcdefghijklmnopqrstuv';
const ITEM_ID = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';
const visible: SharedEntryView = {
  status: 'visible',
  entry: {
    id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
    itemId: ITEM_ID,
    variationId: null,
    venueId: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10',
    eatenAt: '2026-10-22T19:30:00.000Z',
    rating: 5,
    wouldOrderAgain: true,
    pricePaid: { value: 68, currency: 'ILS' as const },
    text: 'Cooked medium like I asked.',
    authorName: 'Noa',
    photoUrl: null,
    createdAt: '2026-10-22T20:00:00.000Z',
  },
  item: {
    id: ITEM_ID,
    name: { he: 'המבורגר הקלאסי', en: 'Classic Burger' },
    listPrice: { value: 68, currency: 'ILS' as const },
    variations: [],
    venue: {
      id: '9c2d3c4e-2222-4c1c-9a57-6f7a5d3c2b10',
      name: { he: 'בורגר 24', en: 'Burger 24' },
    },
  },
};

describe('EntriesSharedPage', () => {
  async function open(shared: EntryApiClient['shared'], backend = new FakeAuthBackend()) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(
          [
            { path: 'e/:token', component: EntriesSharedPage },
            { path: '**', children: [] },
          ],
          withComponentInputBinding(),
        ),
        { provide: EntryApiClient, useValue: { shared } },
        { provide: AUTH_BACKEND, useValue: backend },
      ],
    });
    TestBed.inject(I18n).setLanguage('en');
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/e/${TOKEN}`, EntriesSharedPage);
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

  it('shows the entry with its author, item and venue, and one sign-up prompt for a visitor', async () => {
    const shared = vi.fn().mockResolvedValue(visible);
    const { element } = await open(shared);
    expect(shared).toHaveBeenCalledWith(TOKEN);
    expect(element.querySelector('.by')?.textContent.trim()).toBe('Noa shared a note with you');
    expect(element.querySelector('h1 a')?.getAttribute('href')).toBe(`/items/${ITEM_ID}`);
    expect(element.querySelector('h1')?.textContent).toContain('Classic Burger');
    expect(element.querySelector('.venue')?.textContent).toBe('Burger 24');
    const chips = [...element.querySelectorAll('.chips li')].map((chip) => chip.textContent.trim());
    expect(chips).toEqual(['★ 5', 'Would order again', 'Paid ₪68', 'Oct 22, 2026']);
    expect(element.querySelector('.text')?.textContent).toBe('Cooked medium like I asked.');
    expect(element.querySelectorAll('aside.prompt')).toHaveLength(1);
    expect(element.querySelector('aside.prompt a')?.getAttribute('href')).toBe('/sign-in');
    expect(element.querySelector('.footer')?.textContent).toContain(
      'Their other notes stay private.',
    );
  });

  it('leaves the prompt out for someone signed in', async () => {
    const backend = new FakeAuthBackend();
    backend.signIn();
    const { element } = await open(vi.fn().mockResolvedValue(visible), backend);
    expect(element.querySelector('aside.prompt')).toBeNull();
  });

  it('says a note made private is private, and nothing else', async () => {
    const { element } = await open(vi.fn().mockResolvedValue({ status: 'private' }));
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'This note is private now.',
    );
    expect(element.querySelector('article')).toBeNull();
  });

  it('says a deleted note was removed', async () => {
    const { element } = await open(vi.fn().mockResolvedValue({ status: 'removed' }));
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'This note was removed.',
    );
  });

  it('reads a link that is not one as removed, with nothing to retry', async () => {
    const { element } = await open(
      vi.fn().mockRejectedValue(new HttpErrorResponse({ status: 400 })),
    );
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'This note was removed.',
    );
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('dates the entry in the reader’s language', async () => {
    const { element } = await open(vi.fn().mockResolvedValue(visible));
    expect(element.querySelector('time')?.textContent).toBe('Oct 22, 2026');
  });

  it('offers to try again when loading fails', async () => {
    const shared = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(visible);
    const { harness, element } = await open(shared);
    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement?.querySelector('article')).not.toBeNull();
  });

  it('shows the shared entry’s photo', async () => {
    const { element } = await open(
      vi.fn().mockResolvedValue({
        ...visible,
        entry: { ...visible.entry, photoUrl: '/api/photos/pppppppppppppppppppppp' },
      }),
    );
    expect(element.querySelector('article .photo img')?.getAttribute('src')).toBe(
      '/api/photos/pppppppppppppppppppppp',
    );
  });
});
