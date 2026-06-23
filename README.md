# ניהול חובות בית הכנסת 🕍

מערכת לניהול חובות של מתפללים לבית הכנסת. כוללת התחברות עם גוגל, ממשק ניהול מלא, ותמיכה מלאה בעברית ובמובייל.

## טכנולוגיות

- **React + Vite** - צד לקוח מהיר
- **Supabase** (גרסה חינמית) - בסיס נתונים + אימות משתמשים
- **Vercel** (גרסה חינמית) - אחסון האתר
- **Mobile-first** - עובד מצויין בטלפון

## דרישות מוקדמות

1. חשבון GitHub (חינם) - https://github.com/signup
2. חשבון Supabase (חינם) - https://supabase.com
3. חשבון Vercel (חינם) - https://vercel.com

## הוראות הקמה (צעד אחר צעד)

### שלב 1: העלאת הקוד ל-GitHub

```bash
# בתיקיית הפרויקט
git init
git add .
git commit -m "Initial commit - synagogue debt management"
# צור ריפו חדש ב-GitHub ואז:
git remote add origin https://github.com/שם-המשתמש/chovot.git
git push -u origin main
```

### שלב 2: הגדרת Supabase

1. היכנס לאתר supabase.com ולחץ **"Start a project"**
2. התחבר עם GitHub
3. לחץ על **"New project"**
4. בחר ארגון (או צור אחד), תן שם לפרויקט (למשל: `chovot-synagogue`), בחר סיסמה חזקה ל-DB
5. בחר אזור קרוב אליך ואת התכנית החינמית (**Free tier**)
6. לחץ **"Create new project"** (זה לוקח כדקה)

#### הגדרת אימות גוגל:

7. בתפריט שמאלי, לך ל- **Authentication** → **Providers**
8. מצא **Google** ולחץ עליו
9. צריך ליצור Client ID ב-Google Cloud Console:
   - לך ל- https://console.cloud.google.com/apis/credentials
   - לחץ **Create Credentials** → **OAuth client ID**
   - בחר **Web application**
   - ב-**Authorized redirect URIs** הוסף: `https://הפרויקט-שלך.supabase.co/auth/v1/callback`
     *(את ה-URL הזה תמצא בעמוד ההגדרות של Google Provider ב-Supabase)*
   - העתק את ה-Client ID ו-Client Secret בחזרה ל-Supabase, שמור

#### יצירת הטבלאות:

10. בתפריט שמאלי, לך ל- **SQL Editor**
11. לחץ **"New query"**
12. העתק את תוכן הקובץ `supabase-schema.sql` מהפרויקט והדבק
13. לחץ **"Run"** - זה ייצור את הטבלאות `members` ו-`debts`

#### קבלת מפתחות חיבור:

14. בתפריט שמאלי, לך ל- **Project Settings** → **API**
15. העתק את ה- **URL** (יש לשים ב-VITE_SUPABASE_URL)
16. העתק את ה- **anon public key** (יש לשים ב-VITE_SUPABASE_ANON_KEY)

### שלב 3: הגדרת הפרויקט המקומי

צור קובץ `.env` בתיקיית הפרויקט והכנס את המפתחות:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

הרץ את השרת המקומי:

```bash
npm install
npm run dev
```

האתר יעלה בכתובת `http://localhost:5173` - תוכל לבדוק התחברות עם גוגל.

### שלב 4: העלאה ל-Vercel (חינם)

1. התחבר ל- https://vercel.com
2. לחץ **"Add New..."** → **"Project"**
3. התחבר עם GitHub ובחר את הריפו `chovot`
4. Vercel יזהה אוטומטית שזה פרויקט Vite (Framework Preset: Vite)
5. תחת **"Environment Variables"**, הוסף:
   - `VITE_SUPABASE_URL` - הערך מ-Supabase
   - `VITE_SUPABASE_ANON_KEY` - הערך מ-Supabase
6. לחץ **"Deploy"** - תוך דקות האתר יהיה באוויר!

## שימוש

1. פתח את האתר (ב-Vercel או localhost)
2. לחץ **"התחבר עם גוגל"**
3. התחבר עם חשבון גוגל שלך
4. בדשבורד תראה סיכום כללי
5. לחץ **"מתפללים"** להוספת מתפללים
6. לחץ על מתפלל כדי לנהל את החובות שלו
7. סמן חוב כשולם ע"י לחיצה על ⬜ → ✅

## עלויות

- **Supabase Free Tier**: 500MB DB, 50K משתמשים, 2GB bandwidth
- **Vercel Free Tier**: 100GB bandwidth, 100 שעות build/חודש
- **סך הכול: 0 ש"ח לחודש** (מספיק לבית כנסת קטן-בינוני)
