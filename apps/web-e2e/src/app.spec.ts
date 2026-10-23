import { expect, test } from '@playwright/test';

test('opens in Hebrew, right to left, with the bottom navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  const nav = page.getByRole('navigation', { name: 'ניווט' });
  await expect(nav.getByRole('link', { name: 'גילוי' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'פרופיל' })).toBeVisible();
});
