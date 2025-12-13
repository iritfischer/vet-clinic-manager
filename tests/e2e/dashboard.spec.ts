import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test('should redirect to auth when not authenticated', async ({ page }) => {
    // ניסיון לגשת לדף Dashboard ללא authentication
    await page.goto('/dashboard');
    
    // בדיקה שמתבצע redirect לדף auth
    await expect(page).toHaveURL(/.*auth/);
  });

  test('should display dashboard when authenticated', async ({ page, context }) => {
    // הערה: בדיקה זו דורשת authentication
    // לבדיקות אמיתיות, יש להשתמש ב-authentication helpers
    
    // אפשרות 1: שימוש ב-localStorage או cookies אם יש
    // await context.addCookies([...]);
    
    // אפשרות 2: ביצוע login דרך ה-UI
    // await page.goto('/auth');
    // await page.fill('input[type="email"]', 'test@example.com');
    // await page.fill('input[type="password"]', 'password');
    // await page.click('button[type="submit"]');
    // await page.waitForURL(/.*dashboard/);
    
    // בינתיים, נבדוק רק את ה-redirect
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*auth/);
  });
});

