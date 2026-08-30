# חיבור הטופס ל-n8n

מדריך לבנייה עצמית. אני לא בונה לך את ה-workflow —
אתה בונה, אני מסביר איפה כל נוד ולמה הוא שם.

---

## 📍 מצב נוכחי — 2026-08-30

### מה כן מוכן

| פריט | מצב |
|---|---|
| **גיליון היעד** | ✅ נוצר — [אלון נגרות · פניות מהאתר](https://docs.google.com/spreadsheets/d/1Gmzxx20YxMuI1slw34awWj4RENGRBowLndpboOKDtuw/edit) |
| מזהה הגיליון | `1Gmzxx20YxMuI1slw34awWj4RENGRBowLndpboOKDtuw` |
| כותרות | `תאריך · שם · טלפון · מייל · הודעה · סטטוס` — נכתבו ואומתו |
| **ה-workflow** | ✅ קובץ מוכן לייבוא: [`alon-leads.workflow.json`](alon-leads.workflow.json) |
| `WEBHOOK_URL` ב-`index.html` | ⛔ **עדיין ריק** |

### מה חסם

ה-MCP של n8n לא מחובר — הוא דורש הרשאה, והסשן שבו נבנה זה לא יכול
להריץ OAuth. לכן ה-workflow **לא נבנה בתוך n8n, לא הופעל, ואין
עדיין Production URL**. במקום זה נבנה קובץ ייבוא מלא ומאומת.

### מה נשאר לך (‏5 דקות)

1. n8n → **Import from File** → `docs/alon-leads.workflow.json`
2. לפתוח כל אחד משלושת הנודים ולבחור **credentials** —
   Google Sheets פעם אחת, Gmail פעמיים. הקובץ לא נושא credentials בכוונה.
3. בנוד הגיליון: לוודא שה-**Sheet** בדרופדאון מצביע על הלשונית הנכונה.
   הקובץ מציין `gid=0` (הלשונית הראשונה) — אם n8n מציג שם אחר, לבחור אותו מהרשימה.
4. **Activate**
5. להעתיק את ה-**Production URL** (‏`https://<ההוסט>/webhook/alon-lead`)
   ולהדביק ב-`index.html`, בשורה `const WEBHOOK_URL = '';`

---

## 🚨 לקרוא לפני Activate — הווב-הוק פתוח

המפרט שלפיו נבנה הקובץ הוא **5 נודים**, בלי נוד ולידציה. זה אומר
שמי שמגלה את כתובת הווב-הוק יכול לשלוח אליה POST ישירות.
נוד 4 שולח מייל **לכתובת שמגיעה בגוף הבקשה** — כלומר:

> ווב-הוק פתוח + מייל ליעד דינמי = **ממסר ספאם דרך ה-Gmail של אלון**,
> עם המיתוג שלו. וגם שורות זבל בגיליון.

### ‏CORS הוא לא הגנה

זו הטעות הקלה ביותר כאן. `Allowed Origins` נאכף **בדפדפן**, לא בשרת.
הוא מונע מאתר זר לקרוא לווב-הוק דרך JS של גולש — והוא **לא עושה כלום**
מול `curl` או סקריפט. לנעול את הדומיין אחרי הפריסה זה נכון, אבל זה
לא סוגר את החור הזה.

### שלוש דרכים לסגור, לבחירתך

| # | פתרון | עלות |
|---|---|---|
| 1 | **להחזיר את Code + IF** — המבנה בן 7 הנודים שמתואר בהמשך המסמך. בודק שדות, בולע את ה-honeypot, ועוצר לפני ששולחים מייל | 2 נודים |
| 2 | **Header סודי** — הדף שולח `X-Form-Key`, נוד IF מוודא. עוצר בוטים, לא עוצר מי שיפתח את קוד המקור של הדף | 1 נוד |
| 3 | **להפעיל כמו שזה** ולסמוך על העמימות של ה-URL | 0 |

**ההמלצה: 1.** ה-honeypot (`company`) קיים בטופס אבל נבדק כרגע
**רק בצד הלקוח** — בוט שמדלג על הדף לא נתקל בו בכלל.
המבנה בן 7 הנודים למטה הוא בדיוק זה, והוא כבר כתוב.

---

## מה אנחנו פותרים

אלון כתב:

> *"אני לא רוצה לפספס פניות. היום הן מתערבבות לי בוואטסאפ ואני מגלה אותן אחרי שבוע."*

זו לא בקשה ל"טופס יצירת קשר". זו בקשה ל**תיבת דואר נכנס שלא מתערבבת**.
לכן ה-workflow עושה שלושה דברים:

1. **רושם** את הפנייה בגיליון — הזיכרון
2. **מתריע** לאלון מיד — תשומת הלב
3. **מאשר לפונה** שהפנייה נקלטה — סוגר את חוסר הוודאות בצד השני

---

## ה-workflow — שבעה נודים

```
[1 Webhook]
     ↓
[2 Code — ולידציה]
     ↓
[3 IF  ok?]
     ├── true ──→ [4 Sheets: Append] ─→ [5 Gmail: התראה לאלון]
     │                                          ↓
     │                                  [6 Gmail: אישור לפונה]
     │                                          ↓
     └── false ────────────────────────→ [7 Respond to Webhook]
```

> ⚠️ **שני הענפים חייבים להגיע לנוד 7.**
> ברגע שה-Webhook מוגדר "Using Respond to Webhook node", הוא לא עונה
> לבד. ענף שלא מגיע לנוד תגובה משאיר את הדפדפן תלוי עד timeout,
> והגולש רואה "השליחה לא עברה" למרות שהכל תקין.
> גם ענף הדחייה מחזיר `ok:true` — לבוט אין סיבה לדעת שהוא נדחה.

---

### 1 · Webhook

| הגדרה | ערך |
|---|---|
| HTTP Method | `POST` |
| Path | להשאיר את המזהה שנוצר |
| **Respond** | **`Using Respond to Webhook node`** |

**למה לא `Immediately`:** מענה מיידי מחזיר 200 לפני שהגיליון נכתב
ולפני שהמיילים יצאו. הגולש רואה "קיבלתי" גם כשבפועל כלום לא קרה.
עם נוד תגובה, ה-200 יוצא רק אחרי שהפנייה באמת נשמרה.

אחרי השמירה יש שם שתי כתובות. ה-**Test** עובדת רק כשהחלון פתוח.
זו שגיאת המתחילים הקלאסית — לוקחים את Test, זה עובד בבדיקה,
ואז שקט. **קח את Production URL.**

#### CORS — כאן זה ייתקע

הדף רץ בדומיין אחד, n8n בדומיין אחר. בלי הגדרה הדפדפן חוסם.
**התסמין:** בקונסול `blocked by CORS policy`, וב-n8n לא רואים שום בקשה.

בנוד ה-Webhook, **Options → Add Option → Allowed Origins (CORS)**:

| שלב | ערך |
|---|---|
| פיתוח, לפני פריסה | `*` |
| אחרי הפריסה | הכתובת האמיתית של הדף, בלבד |

n8n מייצר מזה את כותרות ה-CORS ועונה לבקשת ה-`OPTIONS` המקדימה לבד.
**לא להגדיר `Access-Control-*` ידנית ב-Response Headers** — זה מתנגש
עם מה שהנוד כבר שולח, ומייצר כותרת כפולה שהדפדפן דוחה.

`*` הוא לפיתוח בלבד. אם הוא נשאר אחרי הפריסה, כל אתר באינטרנט
יכול להזריק שורות לגיליון של אלון.

#### מה מגיע פנימה

```json
{
  "name":    "ישראל ישראלי",
  "phone":   "052-1234567",
  "email":   "israel@example.com",
  "message": "שולחן אוכל 220x100",
  "company": "",
  "source":  "landing",
  "sentAt":  "2026-08-30T16:40:00.000Z"
}
```

הגוף יושב תחת `$json.body` (לא `$json`) כשה-Webhook מקבל JSON.
זה תופס אנשים כל הזמן — אם הביטויים יוצאים ריקים, זו כנראה הסיבה.

---

### 2 · Code — ולידציה

**קרא לנוד `ולידציה`.** שאר ה-workflow מפנה אליו בשם.

```js
const b = $input.first().json.body ?? $input.first().json;

const digits = String(b.phone ?? '').replace(/\D/g, '');
const email  = String(b.email ?? '').trim().toLowerCase().slice(0, 120);

return [{
  json: {
    ok:      !b.company
             && String(b.name ?? '').trim().length > 1
             && digits.length >= 9
             && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email),
    name:    String(b.name ?? '').trim().slice(0, 80),
    phone:   digits,
    email,
    message: String(b.message ?? '').trim().slice(0, 1000),
    at:      new Date().toISOString()
  }
}];
```

- `!b.company` — **מלכודת הספאם.** השדה מוסתר בדף, בן אדם לא רואה
  אותו. בוט ממלא כל שדה שהוא מוצא. מלא = בוט.
- `digits.length >= 9` — טלפון ישראלי תקין.
- **בדיקת המייל חוסמת, לא קוסמטית.** בלעדיה נוד 6 ינסה לשלוח לכתובת
  שבורה, ייכשל, ויפיל את ההרצה — כולל את השורה בגיליון שכבר נכתבה.
  הפנייה תיעלם בגלל תו חסר.
- הכל עובר `String(...)` ו-`slice`. לעולם לא לסמוך על מה שהגיע מהרשת.

---

### 3 · IF

תנאי בוליאני: `{{ $json.ok }}` הוא `true`.
ענף `false` → ישר לנוד 7.

---

### 4 · Google Sheets — Append Row

לשונית `Leads`, כותרות:

| at | name | phone | email | message | status |
|---|---|---|---|---|---|

`status` נשארת ריקה. זו העמודה שאלון ימלא ידנית —
`חזרתי` / `נסגר` / `לא רלוונטי`. **בלעדיה זו ערימה, לא רשימת מעקב**,
והכאב המקורי חוזר.

> ⚠️ Append, לא Update. נוד Update ידרוס את הפנייה הקודמת.

---

### 5 · Gmail — התראה לאלון

| שדה | ערך |
|---|---|
| To | המייל של אלון |
| Subject | `פנייה חדשה מהאתר — {{ $('ולידציה').item.json.name }}` |
| Email Type | `Text` מספיק כאן |

**גוף:**

```
{{ $('ולידציה').item.json.name }}
{{ $('ולידציה').item.json.phone }}
{{ $('ולידציה').item.json.email }}

{{ $('ולידציה').item.json.message }}
```

השם בנושא הוא לא קישוט. אלון רואה אותו בהתראה בטלפון
ויודע אם זה דחוף בלי לפתוח.

> **למה `$('ולידציה')` ולא `$json`:** אחרי נוד ה-Sheets, `$json`
> מכיל את תשובת הגיליון, לא את הפנייה. הפניה מפורשת לנוד הולידציה
> עובדת מכל מקום ב-workflow.

---

### 6 · Gmail — מייל אישור לפונה

זה הנוד שסוגר את הלולאה בצד של הפונה.

| שדה | ערך |
|---|---|
| **To** | `={{ $('ולידציה').item.json.email }}` ← **דינמי מהטופס** |
| Subject | `קיבלתי את הפנייה שלך` |
| **Email Type** | **`HTML`** |

**גוף HTML.** בלקוחות מייל אין flex, אין grid, ו-`<style>` בראש
נמחק — Gmail חותך אותו. לכן **טבלאות ו-`style=` על כל אלמנט**,
ו-`dir="rtl"` על העוטף החיצוני:

```html
<div dir="rtl" style="margin:0;padding:0;background:#F7F2E9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:#F7F2E9;padding:24px 12px;">
<tr><td align="center">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
         style="max-width:520px;background:#FFFFFF;border:1px solid #E0D6C6;
                font-family:Arial,'Segoe UI',sans-serif;color:#241C15;">

    <tr><td style="padding:28px 24px 8px;">
      <div style="font-size:22px;font-weight:bold;color:#241C15;">קיבלתי את הפנייה שלך</div>
      <div style="font-size:15px;line-height:1.6;color:#6B5A4A;padding-top:10px;">
        שלום {{ $('ולידציה').item.json.name }}, הפנייה נקלטה ואני אחזור אליך.
      </div>
    </td></tr>

    <tr><td style="padding:16px 24px 4px;">
      <div style="font-size:12px;font-weight:bold;letter-spacing:1.4px;color:#99694D;">
        מה שקיבלתי
      </div>
    </td></tr>

    <tr><td style="padding:0 24px 8px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="font-size:15px;">
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #E0D6C6;color:#6B5A4A;width:88px;">שם</td>
          <td style="padding:11px 0;border-bottom:1px solid #E0D6C6;">{{ $('ולידציה').item.json.name }}</td>
        </tr>
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #E0D6C6;color:#6B5A4A;">טלפון</td>
          <td style="padding:11px 0;border-bottom:1px solid #E0D6C6;">{{ $('ולידציה').item.json.phone }}</td>
        </tr>
        <tr>
          <td style="padding:11px 0;border-bottom:1px solid #E0D6C6;color:#6B5A4A;">מייל</td>
          <td style="padding:11px 0;border-bottom:1px solid #E0D6C6;">{{ $('ולידציה').item.json.email }}</td>
        </tr>
        <tr>
          <td style="padding:11px 0;color:#6B5A4A;vertical-align:top;">מה צריך</td>
          <td style="padding:11px 0;">{{ $('ולידציה').item.json.message }}</td>
        </tr>
      </table>
    </td></tr>

    <tr><td style="padding:8px 24px 22px;">
      <div style="font-size:12px;font-weight:bold;letter-spacing:1.4px;color:#99694D;padding-bottom:10px;">
        מה עכשיו
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="font-size:15px;line-height:1.55;">
        <tr>
          <td width="26" style="padding:5px 0;color:#7A5039;font-weight:bold;vertical-align:top;">01</td>
          <td style="padding:5px 0;">שיחת טלפון, להבין מה צריך</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#7A5039;font-weight:bold;vertical-align:top;">02</td>
          <td style="padding:5px 0;">אני מגיע לבית ומודד</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#7A5039;font-weight:bold;vertical-align:top;">03</td>
          <td style="padding:5px 0;">שולח סקיצה עם הצעת מחיר</td>
        </tr>
      </table>
    </td></tr>

    <tr><td style="padding:16px 24px 22px;background:#F1EADD;border-top:1px solid #E0D6C6;
                   font-size:13px;line-height:1.7;color:#6B5A4A;">
      אלון · נגרות בהתאמה אישית<br>
      רחוב הבנים, פרדס חנה · בתיאום מראש<br>
      054-000-0000 · alon@example.co.il
    </td></tr>

  </table>

</td></tr>
</table>
</div>
```

**שלוש נקודות שנופלים עליהן:**

- **התוכן במייל כפוף לאותו חוק כמו הדף.** כל שורה כאן קיימת
  ב-[`business-facts.md`](business-facts.md). לא להוסיף "תודה שבחרת
  בנו" או "אנחנו מתרגשים" — אלון עובד לבד וביקש שלא ינפחו אותו.
- **הטלפון והמייל בפוטר הם ערכי דמה.** להחליף יחד עם הדף.
- **מייל אישור הוא לא מייל שיווקי.** אין קישורי הסרה, אין מעקב,
  אין תמונות חיצוניות — תמונה מרוחקת רק תיחסם ותשאיר ריבוע שבור.

---

### 7 · Respond to Webhook

| שדה | ערך |
|---|---|
| Respond With | `JSON` |
| Response Body | `{ "ok": true }` |
| Response Code | `200` |

מקבל **את שני הענפים** של ה-IF.
הדף בודק רק `res.ok` — הוא לא קורא את הגוף — אבל JSON תקין
משאיר מקום להרחבה בלי לשנות את הדף.

---

## חיבור לדף

ב-[`../index.html`](../index.html), בבלוק ה-`<script>`:

```js
const WEBHOOK_URL = '';   // ← Production URL כאן
```

כל עוד זה ריק, כל שליחה נופלת להודעת *"השליחה לא עברה — כנראה הרשת.
אפשר לנסות שוב."* השדות נשארים מלאים, כך שלחיצה חוזרת לא דורשת
להקליד מחדש.

**כשמשנים: לעשות קומיט.** זה שינוי התנהגות, וצריך להיות ברור
בהיסטוריה מתי המסלול הופעל.

---

## בדיקה לפני שסוגרים

| # | בדיקה | מה צריך לקרות |
|---|---|---|
| 1 | טופס תקין מהטלפון | שורה בגיליון · מייל לאלון · **מייל אישור לפונה** |
| 2 | מייל האישור בטלפון | נקרא מימין לשמאל, הטבלה לא נשברת |
| 3 | למלא את `company` ולשלוח | כלום בגיליון, ו-200 חוזר לדפדפן |
| 4 | מייל `abc@` (לא תקין) | נדחה. שום מייל לא יוצא |
| 5 | טלפון של 3 ספרות | נדחה |
| 6 | לשלוח פעמיים | שתי שורות, לא אחת שנדרסה |
| 7 | לפתוח את הדף מדומיין אחר | נחסם, אחרי שהוחלף `*` בכתובת האמיתית |

בדיקה 3 היא זו שנוטים לדלג עליה. אם ענף הדחייה לא מחובר לנוד 7,
הדפדפן ייתלה עד timeout והגולש יראה שגיאה — למרות שהמערכת עבדה כמתוכנן.
