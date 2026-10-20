# מיתוג מירי

שתי משפחות פונטים למיתוג, שנבנו מדפי הדוגמה שבתיקייה `source/`. לכל משפחה ארבעה משקלים: Thin ‏(100), Regular ‏(400), Bold ‏(700) ו-ExtraBold ‏(800).

| משפחה | סגנון |
|---|---|
| **Miri Block** | סנס-סריף גיאומטרי לכותרות |
| **Miri Script** | כתב מברשת |

## מה יש בכל פונט
- אותיות גדולות A–Z
- אותיות קטנות a–z
- ספרות 0–9
- רווח, נקודה ונקודתיים

**אין בפונטים** אותיות עבריות, סימני פיסוק אחרים, אותיות עם סימנים (כמו é) או קרנינג, כי הם לא מופיעים בדפי הדוגמה.

## קבצים
- `fonts/*.otf`: להתקנה במחשב (Mac/Windows), לשימוש ב-Canva, Figma, Word וכו'
- `fonts/*.woff2`: לשימוש באתר
- `fonts/fonts.css`: הגדרות `@font-face` מוכנות לאתר
- `index.html`: דף תצוגה של כל המשקלים

## שימוש באתר
```html
<link rel="stylesheet" href="fonts/fonts.css">
<style>
  h1 { font-family: "Miri Block"; font-weight: 800; }
  .accent { font-family: "Miri Script"; font-weight: 700; }
</style>
```

## בנייה מחדש
הפונטים נוצרים אוטומטית מתמונות הדוגמה. כל אות עוברת המרה לווקטור, ואז הסקריפט בונה ממנה את קובץ הפונט:
```bash
pip install fonttools brotli numpy scipy scikit-image potracer opencv-python-headless skia-pathops
python3 tools/build.py
```
