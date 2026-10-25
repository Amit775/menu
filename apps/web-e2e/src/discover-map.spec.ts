import { expect, type Page, test } from '@playwright/test';

const venue = { id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10', name: { he: 'מוזס', en: 'Moses' } };
const item = {
  id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  name: { he: 'המבורגר הבית', en: null },
  venue,
  sectionId: '5c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
  tagIds: [],
  distanceMeters: null,
  score: 4.6,
  ratingCount: 12,
  wouldOrderAgainPercent: 92,
  latestPrice: { value: 68, currency: 'ILS' as const },
  photoUrl: null,
  writtenByMe: false,
};
const pin = {
  venue,
  location: { lat: 32.0641, lng: 34.7744 },
  itemCount: 3,
  bestScore: 4.6,
  writtenByMe: false,
};

async function stubBackends(page: Page): Promise<void> {
  await page.route('**/api/discover/feed**', (route) =>
    route.fulfill({ json: { items: [item], nextOffset: null } }),
  );
  await page.route('**/api/discover/map**', (route) => route.fulfill({ json: [pin] }));
  await page.route('**/api/discover/venues/**', (route) =>
    route.fulfill({ json: { sections: [] } }),
  );
  await page.route('**/api/tags', (route) => route.fulfill({ json: [] }));
  await page.route('**/__/firebase/init.json', (route) => route.fulfill({ status: 404 }));
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
}

test('shows venues on the map, styled by Leaflet, and opens one from the keyboard', async ({
  page,
}) => {
  await stubBackends(page);
  await page.goto('/');
  await page.getByRole('radio', { name: 'מפה' }).click();

  const marker = page.getByRole('button', { name: /^מוזס, 3 פריטים/ });
  await expect(marker).toBeVisible();

  // Leaflet's stylesheet is served as CSS, not as the index.html fallback.
  const href = await page.locator('link[href^="leaflet-"]').getAttribute('href');
  const css = await page.request.get(href ?? '');
  expect(css.headers()['content-type']).toContain('css');
  await expect(page.locator('.leaflet-container')).toHaveCSS('overflow', 'hidden');

  await marker.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'מוזס' })).toBeFocused();
  await expect(page.getByRole('link', { name: 'לעמוד המקום' })).toHaveAttribute(
    'href',
    `/venues/${venue.id}`,
  );

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'מוזס' })).toHaveCount(0);
  await expect(marker).toBeFocused();
});
