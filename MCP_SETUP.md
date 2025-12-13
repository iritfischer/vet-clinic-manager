# הגדרת MCP של Playwright ב-Cursor

## שלב 1: התקנת Playwright MCP

התקן את חבילת Playwright MCP:

```bash
npm install -g @playwright/mcp
```

או השתמש ב-npx:

```bash
npx @playwright/mcp@latest
```

## שלב 2: הגדרת MCP Server ב-Cursor

1. פתח את הגדרות Cursor:
   - לחץ על `Cmd + ,` (Mac) או `Ctrl + ,` (Windows/Linux)
   - או עבור ל-`Cursor > Settings`

2. חפש "MCP" או "Model Context Protocol" בהגדרות

3. הוסף את הגדרת Playwright MCP:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "cwd": "/Users/irit/Desktop/dev.irit/product-vision-board-main"
    }
  }
}
```

**הערה:** החלף את הנתיב `cwd` בנתיב המלא של הפרויקט שלך.

## שלב 3: אימות ההגדרה

1. הפעל מחדש את Cursor
2. בדוק שהשרת MCP של Playwright מופיע ברשימת השרתים הפעילים
3. נסה להשתמש בפונקציות של Playwright דרך Cursor

## שימוש

לאחר ההגדרה, תוכל לבקש מ-Cursor:
- "הרץ בדיקות Playwright"
- "צור בדיקת E2E לדף X"
- "בדוק מה עובד ומה לא באפליקציה"

## משתני סביבה (אופציונלי)

אם אתה צריך משתני סביבה לבדיקות, צור קובץ `.env.test`:

```env
VITE_SUPABASE_URL=your_test_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_test_key
```

ואז עדכן את `playwright.config.ts` לטעון את המשתנים האלה.

