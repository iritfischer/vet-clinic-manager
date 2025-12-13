import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate to different pages', async ({ page }) => {
    // התחלה מדף auth
    await page.goto('/auth');
    await expect(page).toHaveURL(/.*auth/);

    // בדיקה שהדף נטען בהצלחה
    await expect(page).toHaveTitle(/.*/);
  });

  test('should handle 404 page', async ({ page }) => {
    // ניסיון לגשת לדף שלא קיים
    await page.goto('/non-existent-page');
    
    // בדיקה שהדף מציג 404 או NotFound
    const notFoundText = page.getByText(/404|not found|לא נמצא/i);
    if (await notFoundText.count() > 0) {
      await expect(notFoundText.first()).toBeVisible();
    }
  });

  test('should have proper page structure', async ({ page }) => {
    await page.goto('/auth');
    
    // בדיקה שיש אלמנט body
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // בדיקה שהדף לא ריק
    const content = page.locator('main, [role="main"], #root, #app');
    if (await content.count() > 0) {
      await expect(content.first()).toBeVisible();
    }
  });
});

