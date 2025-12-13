# בדיקות E2E עם Playwright

## התקנה

הבדיקות כבר מוגדרות בפרויקט. כדי להריץ אותן:

```bash
npm run test:e2e
```

## הרצת בדיקות

### כל הבדיקות
```bash
npm run test:e2e
```

### בדיקות עם UI
```bash
npm run test:e2e:ui
```

### בדיקות עם דפדפן גלוי
```bash
npm run test:e2e:headed
```

### בדיקות ספציפיות
```bash
npx playwright test tests/e2e/auth.spec.ts
```

## מבנה הבדיקות

- `tests/e2e/auth.spec.ts` - בדיקות לדף התחברות
- `tests/e2e/dashboard.spec.ts` - בדיקות לדף Dashboard
- `tests/e2e/navigation.spec.ts` - בדיקות ניווט
- `tests/e2e/app.spec.ts` - בדיקות כלליות לאפליקציה

## הגדרות

ההגדרות נמצאות ב-`playwright.config.ts`. השרת הפיתוח רץ אוטומטית לפני הבדיקות על פורט 8080.

## משתני סביבה

אם אתה צריך משתני סביבה לבדיקות, צור קובץ `.env.test` עם המשתנים הנדרשים.

## שימוש ב-MCP של Playwright ב-Cursor

לאחר הגדרת MCP server של Playwright ב-Cursor (ראה `MCP_SETUP.md`), תוכל לבקש מ-Cursor:
- "הרץ את כל הבדיקות"
- "בדוק מה עובד ומה לא באפליקציה"
- "צור בדיקת E2E לדף X"

