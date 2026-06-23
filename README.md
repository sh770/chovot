# ניהול חובות בית הכנסת 🕍

מערכת לניהול חובות של מתפללים לבית הכנסת. תומכת בריבוי בתי כנסת - כל בית כנסת מקבל סביבה נפרדת עם מנהלים משלו.

**תכונות:**
- התחברות עם גוגל
- ניהול מתפללים וחובות
- תמיכה בריבוי בתי כנסת (multi-tenant)
- ממשק ניהול מערכת למנהל הראשי
- Mobile-first, עברית מלאה

## טכנולוגיות

- **React + Vite** - צד לקוח מהיר
- **Supabase** (גרסה חינמית) - בסיס נתונים + אימות משתמשים
- **Vercel** או **Cloudflare Pages** (גרסה חינמית) - אחסון
- **Mobile-first** - עובד מצויין בטלפון

## דרישות מוקדמות

1. חשבון GitHub (חינם) - https://github.com/signup
2. חשבון Supabase (חינם) - https://supabase.com
3. חשבון Vercel (חינם) - https://vercel.com (אופציונלי - לפרסום באינטרנט)

## הוראות הקמה (צעד אחר צעד)

### שלב 1: העלאת הקוד ל-GitHub

```bash
cd D:\Desktop\chovot
git add .
git commit -m "אפליקציית ניהול חובות לבתי כנסת"
git branch -M main
git remote add origin https://github.com/שם-המשתמש/chovot.git
git push -u origin main
```

(תחליף את `שם-המשתמש` בשם משתמש GitHub שלך. צריך קודם ליצור ריפו חדש ב-GitHub.)

### שלב 2: הרצת סקריפט מסד הנתונים ב-Supabase

הרץ את הקובץ `supabase-schema.sql` ב-Supabase SQL Editor כדי ליצור את כל הטבלאות:

1. התחבר ל- **[supabase.com](https://supabase.com)** ובחר את הפרויקט שלך
2. בתפריט השמאלי, לך ל- **SQL Editor**
3. לחץ **New query**
4. העתק את תוכן הקובץ `supabase-schema.sql` (שנמצא בתיקיית הפרויקט)
5. הדבק בעורך ולחץ **▶️ Run**

#### אם כבר יש לך נתונים קיימים (מהגרסה הקודמת):

אחרי שהרצת את הסקריפט הראשי, הרץ גם את הסקריפט הזה כדי לשייך נתונים קיימים:

```sql
-- צור בית כנסת ראשון לנתונים הקיימים
INSERT INTO synagogues (name) VALUES ('בית הכנסת שלי');

-- עדכן חברים קיימים
UPDATE members SET synagogue_id = (SELECT id FROM synagogues LIMIT 1)
WHERE synagogue_id IS NULL;

-- עדכן חובות קיימים
UPDATE debts SET synagogue_id = (SELECT id FROM synagogues LIMIT 1)
WHERE synagogue_id IS NULL;

-- צור פרופיל מנהל למשתמש הראשון
-- חשוב: החלף את ה-user_id בזהות המשתמש שלך
-- (אפשר למצוא אותו ב- Authentication → Users)
INSERT INTO profiles (user_id, email, name, synagogue_id, role)
VALUES ('הכנס-את-user-id-שלך', 'your-email@gmail.com', 'השם שלך',
  (SELECT id FROM synagogues LIMIT 1), 'super_admin');
```

### שלב 3: הגדרת הפרויקט המקומי

צור קובץ `.env` בתיקיית הפרויקט:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

הרץ:

```bash
npm install
npm run dev
```

### שלב 4: פרסום באינטרנט

#### אופציה א' - Vercel (קל ומהיר):
1. לך ל- https://vercel.com, לחץ **Add New → Project**
2. התחבר עם GitHub ובחר את הריפו `chovot`
3. הוסף Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. לחץ **Deploy**

#### אופציה ב' - Cloudflare Pages (מומלץ, חינמי לגמרי):
1. לך ל- https://dash.cloudflare.com → **Workers & Pages**
2. לחץ **Create → Pages → Connect to Git**
3. בחר את הריפו `chovot`
4. הגדרות build:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
5. הוסף Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. לחץ **Save and Deploy**
7. אחרי הדיפלוי, לך ל- **Custom domains** כדי לחבר דומיין משלך

## איך זה עובד - מערכת ריבוי בתי כנסת

### תפקידים במערכת

| תפקיד | הרשאות |
|-------|---------|
| **מנהל מערכת** (super_admin) | רואה הכל, מוסיף בתי כנסת ומנהלים |
| **מנהל** (admin) | רואה ומנהל רק את בית הכנסת שלו |

### זרימת עבודה

1. **אתה (הראשון)**: נכנס → יוצר את בית הכנסת שלך → הופך למנהל מערכת
2. **ניהול מערכת**: מלוח הניהול מוסיף בתי כנסת נוספים ומזמין מנהלים
3. **מנהלים חדשים**: נכנסים עם גוגל → מקבלים גישה אוטומטית לבית הכנסת שלהם
4. **בידוד נתונים**: כל בית כנסת רואה רק את המתפללים והחובות שלו

### ניהול מערכת

ממשק הניהול (זמין רק למנהל המערכת) מאפשר:
- הוספת בתי כנסת חדשים
- הוספת מנהלים לבתי כנסת
- מחיקת בתי כנסת
- צפייה בכל המנהלים
 
## עלויות

- **Supabase Free Tier**: 500MB DB, 50K משתמשים, 2GB bandwidth
- **Cloudflare Pages**: ללא הגבלת bandwidth, חינמי לגמרי
- **סך הכול: 0 ש"ח לחודש** (מספיק לעשרות בתי כנסת)
