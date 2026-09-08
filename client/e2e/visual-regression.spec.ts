import { expect, test } from '@playwright/test';

test.describe('desktop visual regression', () => {
  test.skip(({ isMobile }) => isMobile, 'Reference Figma frames use the desktop viewport');

  test('rooms loading state keeps its layout', async ({ page }) => {
    await page.goto('/rooms?__state=loading');
    await expect(page.getByRole('heading', { name: 'Загрузка переговорных...' })).toBeVisible();
    await expect(page).toHaveScreenshot('rooms-loading.png', {
      animations: 'disabled',
      mask: [page.locator('.office-selector p'), page.locator('.filter-bar')],
      maxDiffPixelRatio: 0.01,
    });
  });

  test('bookings empty state keeps its layout', async ({ page }) => {
    await page.goto('/bookings?__state=empty');
    await expect(page.getByRole('heading', { name: 'Нет бронирований' })).toBeVisible();
    await expect(page).toHaveScreenshot('bookings-empty.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });

  test('not-found page keeps its layout', async ({ page }) => {
    await page.goto('/unknown-visual-route');
    await expect(page.getByRole('heading', { name: 'Страница не найдена' })).toBeVisible();
    await expect(page).toHaveScreenshot('not-found.png', {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
    });
  });
});
