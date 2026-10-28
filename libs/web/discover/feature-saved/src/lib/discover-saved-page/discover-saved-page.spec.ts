import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { type DiscoverItem } from '@menu/shared/contracts';
import { DiscoverApiClient, SavedItems } from '@menu/web/discover/data-access';
import { DeviceLocation } from '@menu/web/shared/util-device';
import { I18n } from '@menu/web/shared/util-i18n';
import { DiscoverSavedPage } from './discover-saved-page';

describe('DiscoverSavedPage', () => {
  const item = (n: number): DiscoverItem => ({
    id: `0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b${String(n).padStart(2, '0')}`,
    name: { he: `פריט ${String(n)}`, en: null },
    venue: { id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10', name: { he: 'מוזס', en: null } },
    sectionId: '5c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
    tagIds: [],
    distanceMeters: null,
    score: null,
    ratingCount: 0,
    wouldOrderAgainPercent: null,
    latestPrice: null,
    photoUrl: null,
    writtenByMe: false,
    savedByMe: true,
  });

  async function render(saved: DiscoverApiClient['saved'], unsave = vi.fn()) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: DiscoverApiClient, useValue: { saved, unsave } },
        { provide: DeviceLocation, useValue: { locate: () => Promise.resolve(null) } },
      ],
    });
    TestBed.inject(I18n).setLanguage('he');
    const fixture = TestBed.createComponent(DiscoverSavedPage);
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).querySelector('mat-spinner')).toBeNull();
    });
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('lists the saved items, newest first', async () => {
    const { element } = await render(vi.fn().mockResolvedValue([item(2), item(1)]));
    expect(element.querySelector('h1')?.textContent).toBe('רוצה לנסות');
    expect(
      [...element.querySelectorAll('menu-item-row a')].map((a) => a.getAttribute('href')),
    ).toEqual([`/items/${item(2).id}`, `/items/${item(1).id}`]);
  });

  it('drops an item the moment it is no longer saved', async () => {
    const { fixture, element } = await render(
      vi.fn().mockResolvedValue([item(1)]),
      vi.fn().mockResolvedValue(undefined),
    );
    await TestBed.inject(SavedItems).toggle(item(1));
    await fixture.whenStable();
    expect(element.querySelector('menu-item-row')).toBeNull();
    expect(element.querySelector('.state')?.textContent).toContain('עוד לא שמרתם כלום');
  });

  it('offers to try again when the list does not load', async () => {
    const saved = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue([item(1)]);
    const { fixture, element } = await render(saved);
    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(element.querySelector('menu-item-row')).not.toBeNull();
    });
  });
});
