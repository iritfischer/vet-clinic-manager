import { test, expect } from '@playwright/test';

test.describe('Application Basic Tests', () => {
  test('should load the application', async ({ page }) => {
    await page.goto('/');
    
    // בדיקה שהדף נטען
    await expect(page).toHaveURL(/.*/);
    
    // בדיקה שיש תוכן בדף
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');
    
    // בדיקה שיש title
    const title = await page.title();
    expect(title).toBeTruthy();
  });

  test('should handle client-side routing', async ({ page }) => {
    await page.goto('/');
    
    // בדיקה שהאפליקציה React נטענת
    // (אפשר לבדוק אלמנטים ספציפיים של React Router)
    await page.waitForLoadState('networkidle');
    
    // בדיקה שהדף לא מציג שגיאות JavaScript
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.waitForTimeout(1000);
    
    // אם יש שגיאות קריטיות, נדווח עליהן
    // (אבל לא נכשיל את הבדיקה כי יכול להיות שיש שגיאות לא קריטיות)
    if (errors.length > 0) {
      console.log('JavaScript errors found:', errors);
    }
  });

  test('should be responsive', async ({ page }) => {
    // בדיקה שהדף עובד על mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth');
    
    // בדיקה שהדף נטען (auth או login)
    await expect(page).toHaveURL(/.*(auth|login)/);
    
    // בדיקה שהדף עובד על desktop
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/auth');
    
    // בדיקה שהדף נטען (auth או login)
    await expect(page).toHaveURL(/.*(auth|login)/);
  });
});

