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

## ספר המותג
`brand-book.html` הוא ספר המותג, והוא בנוי על המיתוג החי של mirideutsch.com: לוגו MIRI, צבעים 60/30/10, הפונטים Nostela, Sprinter ו-Pompei Narrow, שפה חזותית, מדבקות, רכיבים, קול ורעיונות.

- `brand/logo/`: הלוגו כ-SVG בכל הגרסאות, כולל ה-M לבד
- `brand/stickers/`: שבע המדבקות מהאתר
- `brand/emblems/`, `brand/img/`: סמלים, חפצי כסף, פרפרים וצילומים
- `brand/fonts/`: לא נשמר בריפו, כי אלה פונטים ברישיון (פונטשוק). כדי לראות את הספר מקומית, מעתיקים לשם את `Nostela-VF.woff2`, `Sprinter-VF.woff2` ו-`PompeiNarrow-VF.woff2` מהאתר
- עריכה: משנים את `tools/brand-book.template.html` ומריצים `python3 tools/build-brand-book.py`

צבעים רשמיים: פוקסיה `#EC0B8C`, דיו `#242A30`, רצפה `#EAEAEA`, שנהב `#F4F4F4`.
