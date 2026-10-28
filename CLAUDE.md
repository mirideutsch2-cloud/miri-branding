# הוראות קבועות לקלוד קוד בריפו הזה

- הבריף של האתר: `docs/BRIEF.md`. נכסים חסרים ומקומות שמורים: `docs/ASSETS.md`.
- האתר נמצא ב-`site/`. הוא בנוי ב-HTML סטטי עם GSAP ו-Three.js.

## עובדים על גרסאות ב, ג, ד ו-ה

מירי ביקשה: כל העבודה היא על גרסה ב (`site/full-curtain.html`), אלא אם היא אומרת אחרת במפורש. ב-28.10 היא ביקשה לשכפל אתר נוסף, גרסה ג (`site/paint.html`), עם אנימציה של משיכות וכתמי צבע. גרסה ג משתמשת ב-`css/paint.css` וב-`js/paint.js` משלה, ובאותם טקסטים כמו גרסה ב.
באותו ערב מירי כתבה שהכול "נראה איום", וביקשה להתחיל מרעיון חדש לגמרי, בלי שום רעיון קודם שלה, לאתר פורטפוליו שיזכה בתחרויות: גרסה ד (`site/portfolio.html`, "לוח יציאות"), עם `css/portfolio.css` ו-`js/board.js`. אותם טקסטים כמו גרסה ב.
כשמירי ביקשה שוב אתר פורטפוליו שיזכה בתחרויות, נבנתה גרסה ה (`site/spotlight.html`, "אור על המוצר"), עם `css/spotlight.css` ו-`js/spotlight.js`, לפי הלקחים מאתר עוגן (`docs/DESIGN-RULES-OGEN.md`). אותם טקסטים כמו גרסה ב.
- את `site/index.html` (הגרסה הראשית) לא משנים.
- שינויי עיצוב לגרסה ב כותבים תחת `.hero--full` או במחלקות חדשות שרק `full-curtain.html` משתמש בהן, כדי שהגרסה הראשית לא תשתנה בלי כוונה. אם שינוי בקובץ משותף (`css`, `js`, `img`) בכל זאת משפיע על הגרסה הראשית, אומרים את זה למירי.
- בסוף סשן מפרסמים את הגרסאות שהשתנו (ב, ג, ד ו/או ה), ומסיימים בלינקים שלהן.
- מ-28.10 (בקשת מירי): כל כללי הסטייליינר חלים על גרסאות ב, ג, ד ו-ה, גם כשהם סותרים בקשות קודמות שלה (הדר דביק, תפריט פתוח, הנעה לפעולה בכל אזור, וואטסאפ צף).

## בסוף כל סשן שבו `site/` השתנה: לתת למירי לינק לאתר החי

יש שתי גרסאות, ולכל אחת לינק קבוע משלה. מפרסמים כל גרסה לכתובת שלה, עם `url`, ולא כ-artifact חדש:

| גרסה | קובץ | בנייה | לינק |
|---|---|---|---|
| ראשית: לוגו למעלה, וילון מתחת | `site/index.html` | `python3 tools/build_preview.py` | https://claude.ai/artifact/JutQj2DWXcEV9226Y5ceb4 |
| ה: אור על המוצר, אלומה שחושפת את המשפט (28.10) | `site/spotlight.html` | `python3 tools/build_preview.py spotlight.html` ואז אותם עמודי מידע עם `--doc` | https://claude.ai/artifact/2fFMYBdtQ8sV1gidkFRWxn |
| ד: לוח יציאות, אותיות מתהפכות (28.10) | `site/portfolio.html` | `python3 tools/build_preview.py portfolio.html` ואז אותם עמודי מידע עם `--doc` | https://claude.ai/artifact/XRHktho7fWBsJwzSrhXyAi |
| ג: משיכות מכחול בתלת-ממד (28.10) | `site/paint.html` | `python3 tools/build_preview.py paint.html` ואז אותם עמודי מידע עם `--doc` | https://claude.ai/artifact/ADWLUosTKqW1YxUZrjH9tG |
| ב: וילון על כל המסך ועליו המשפט (28.10) | `site/full-curtain.html` | `python3 tools/build_preview.py full-curtain.html` ואז `python3 tools/build_preview.py --doc accessibility.html privacy.html terms.html 404.html` | https://claude.ai/artifact/LrB7h5tWJgd6WaNfNRVzUT |

לגרסה ב יש ארבעה עמודי מידע (נגישות, פרטיות, תנאים, 404). מפרסמים אותם באותו artifact כקבצים נוספים (`files`), בשמות `accessibility.html`, `privacy.html`, `terms.html`, `404.html`. הסקריפט בונה את `build/preview/<קובץ>` כקובץ אחד, ו-`build/` לא נכנס לגיט. שתי הגרסאות משתמשות באותם `css`, `js` ו-`img`, אז שינוי משותף מחייב לפרסם את שתיהן. מסיימים את הסיכום בלינקים.

מירי קובעת מי רואה כל לינק דרך תפריט Share. מ-27.10 הלינק הראשי פתוח לכל מי שיש לו אותו. הלינק של גרסה ב נוצר פרטי. בדף משובצים הפונטים המורשים, לכן לא מפרסמים אותו ב-GitHub Pages כל עוד הריפו ציבורי.

## פונטים מורשים

Nostela (כותרות), Sprinter (טקסט) ו-Pompei Narrow (תוויות), בתיקייה `site/fonts-licensed/`, הם קבצים שכל הזכויות בהם שמורות. התיקייה ב-`.gitignore`, ואסור להכניס אותה לגיט כל עוד הריפו ציבורי. בסשן חדש מעתיקים אותם מהסקיל `miri-web-design/assets/fonts/`. בלי הקבצים האלה סקריפט הבנייה עוצר ואומר איזה קובץ חסר.
