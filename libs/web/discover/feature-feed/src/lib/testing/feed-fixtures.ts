import { type Provider } from '@angular/core';
import { type DiscoverItem } from '@menu/shared/contracts';
import { DiscoverApiClient } from '@menu/web/discover/data-access';
import { DeviceLocation, DeviceShare } from '@menu/web/shared/util-device';
import { AUTH_BACKEND, FakeAuthBackend } from '@menu/web/shared/util-auth';

export const VENUE_ID = '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10';

export function sampleItem(n: number, changes: Partial<DiscoverItem> = {}): DiscoverItem {
  return {
    id: `0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b${String(n).padStart(2, '0')}`,
    name: { he: `פריט ${String(n)}`, en: `Item ${String(n)}` },
    venue: { id: VENUE_ID, name: { he: 'מוזס', en: 'Moses' } },
    sectionId: '5c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
    tagIds: [],
    distanceMeters: 350,
    score: 4.5,
    ratingCount: 12,
    wouldOrderAgainPercent: 90,
    latestPrice: { value: 68, currency: 'ILS' as const },
    photoUrl: null,
    writtenByMe: false,
    ...changes,
  };
}

export function boundaries(
  api: Partial<DiscoverApiClient>,
  share: DeviceShare['share'] = () => Promise.resolve('shared'),
): Provider[] {
  return [
    { provide: DiscoverApiClient, useValue: { tags: () => Promise.resolve([]), ...api } },
    {
      provide: DeviceLocation,
      useValue: { locate: () => Promise.resolve(null), position: () => null },
    },
    { provide: DeviceShare, useValue: { share } },
    { provide: AUTH_BACKEND, useValue: new FakeAuthBackend() },
  ];
}
