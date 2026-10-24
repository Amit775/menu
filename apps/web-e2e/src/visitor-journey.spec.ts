import { expect, type Page, test } from '@playwright/test';

const venue = { id: '7b1d3c4e-1111-4c1c-9a57-6f7a5d3c2b10', name: { he: 'מוזס', en: 'Moses' } };
const photoId = 'e2ePhotoE2ePhotoE2ePh0';
const photoUrl = `/api/photos/${photoId}`;
const item = {
  id: '0e9a4c8e-6a35-4c1c-9a57-6f7a5d3c2b10',
  name: { he: 'המבורגר הבית', en: 'House burger' },
  venue,
  sectionId: '5c2f4d1a-2222-4c1c-9a57-6f7a5d3c2b10',
  tagIds: [],
  distanceMeters: null,
  score: 4.6,
  ratingCount: 12,
  wouldOrderAgainPercent: 92,
  latestPrice: 6800,
  photoUrl,
  writtenByMe: false,
};
const entry = {
  id: '3f1d3c4e-4444-4c1c-9a57-6f7a5d3c2b10',
  itemId: item.id,
  venueId: venue.id,
  eatenAt: '2026-10-20T19:30:00.000Z',
  rating: 5,
  wouldOrderAgain: true,
  pricePaid: 6800,
  text: 'מדיום מושלם',
  authorName: 'נועה',
  photoUrl,
  createdAt: '2026-10-20T20:00:00.000Z',
};
const itemRef = { id: item.id, name: item.name, listPrice: 6800, venue };
const token = 'shareTokenShareToken00';
/** A 1x1 PNG, enough for the browser to load and lay out. */
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/iZk9HQAAAABJRU5ErkJggg==',
  'base64',
);

/** The API and the outside world, stubbed: this checks the built web app on its own. */
async function stubBackends(page: Page): Promise<void> {
  await page.route('**/api/**', (route) => route.fulfill({ status: 404, json: {} }));
  await page.route('**/api/discover/feed**', (route) =>
    route.fulfill({ json: { items: [item], nextOffset: null } }),
  );
  await page.route('**/api/discover/venues/**', (route) =>
    route.fulfill({ json: { sections: [] } }),
  );
  await page.route(`**/api/discover/items/${item.id}**`, (route) =>
    route.fulfill({
      json: {
        item,
        archived: false,
        tags: [],
        priceHistory: [{ month: '2026-09', averagePrice: 6500, count: 3 }],
        alsoGoodHere: [],
      },
    }),
  );
  await page.route(`**/api/items/${item.id}/entries`, (route) =>
    route.fulfill({ json: { item: itemRef, itemIsPublic: true, mine: [], others: [entry] } }),
  );
  await page.route(`**/api/shared/${token}`, (route) =>
    route.fulfill({ json: { status: 'visible', entry, item: itemRef } }),
  );
  await page.route(`**${photoUrl}`, (route) =>
    route.fulfill({ body: png, contentType: 'image/png' }),
  );
  await page.route('**/api/tags', (route) => route.fulfill({ json: [] }));
  await page.route('**/__/firebase/init.json', (route) => route.fulfill({ status: 404 }));
  await page.route('https://tile.openstreetmap.org/**', (route) => route.abort());
}

test('a visitor finds an item, reads what people say and is asked to sign in to log it', async ({
  page,
}) => {
  await stubBackends(page);
  await page.goto('/');

  const reel = page.getByRole('article', { name: 'המבורגר הבית' });
  await expect(reel.locator('.backdrop img')).toHaveJSProperty('complete', true);
  await reel.getByRole('heading', { name: 'המבורגר הבית' }).getByRole('link').click();

  await expect(page).toHaveURL(`/items/${item.id}`);
  await expect(page.getByRole('heading', { level: 1, name: 'המבורגר הבית' })).toBeVisible();
  await expect(page.locator('.hero img')).toHaveAttribute('src', photoUrl);
  await page.getByRole('link', { name: 'לכל הרשומות' }).click();

  await expect(page).toHaveURL(`/items/${item.id}/entries`);
  const card = page.locator('menu-entry-card').filter({ hasText: 'מדיום מושלם' });
  await expect(card.getByRole('img', { name: 'תמונה מהרשומה' })).toBeVisible();
  await page.getByRole('link', { name: 'אכלתי את זה · רשומה חדשה' }).click();

  await expect(page).toHaveURL(/\/sign-in\?returnUrl=/);
  await expect(page.getByRole('heading', { name: 'כניסה' })).toBeVisible();
});

test('a shared entry shows its photo and invites the visitor to join', async ({ page }) => {
  await stubBackends(page);
  await page.goto(`/e/${token}`);

  await expect(page.getByText('נועה שיתף/ה איתך רשומה')).toBeVisible();
  await expect(page.getByRole('img', { name: 'התמונה מהרשומה' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'שמרו לעצמכם מה אכלתם' })).toBeVisible();
});
