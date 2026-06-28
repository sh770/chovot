-- ==========================================================
-- הרצה בסביבת SQL של Supabase (SQL Editor)
-- יוצר טבלאות חדשות ומעדכן קיימות לתמיכה בריבוי בתי כנסת
-- ==========================================================

-- 1. טבלת בתי כנסת
CREATE TABLE IF NOT EXISTS synagogues (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. טבלת פרופילים (מחברת משתמש גוגל לבית הכנסת)
CREATE TABLE IF NOT EXISTS profiles (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  synagogue_id BIGINT REFERENCES synagogues(id) ON DELETE SET NULL,
  member_id BIGINT REFERENCES members(id) ON DELETE SET NULL,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. פונקציית עזר למניעת recursion בפוליסיס (SECURITY DEFINER = בלי RLS)
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid()::text AND role = 'super_admin'
  );
$$;

-- פונקציה לחיפוש פרופיל לפי אימייל (ללא RLS) - למשתמשים חדשים שמתחברים לפרופיל קיים
CREATE OR REPLACE FUNCTION public.find_profile_by_email(user_email TEXT)
RETURNS TABLE(id BIGINT, user_id TEXT, email TEXT, name TEXT, phone TEXT, synagogue_id BIGINT, role TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, user_id, email, name, phone, synagogue_id, role, created_at
  FROM profiles
  WHERE email = user_email
  LIMIT 1;
$$;

-- פונקציה להצגת רשימת בתי כנסת (ללא RLS) למשתמשים חדשים
CREATE OR REPLACE FUNCTION public.list_synagogues()
RETURNS TABLE(id BIGINT, name TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, created_at
  FROM synagogues
  ORDER BY name;
$$;

-- 4. הוספת synagogue_id לטבלאות קיימות
ALTER TABLE members ADD COLUMN IF NOT EXISTS synagogue_id BIGINT REFERENCES synagogues(id) ON DELETE CASCADE;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS synagogue_id BIGINT REFERENCES synagogues(id) ON DELETE CASCADE;
ALTER TABLE debts ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0;

-- 4. אינדקסים
CREATE INDEX IF NOT EXISTS idx_members_synagogue ON members(synagogue_id);
CREATE INDEX IF NOT EXISTS idx_debts_synagogue ON debts(synagogue_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_synagogue ON profiles(synagogue_id);

-- 5. הפעלת RLS
ALTER TABLE synagogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. מחיקת מדיניות ישנה ויצירת חדשה
DROP POLICY IF EXISTS "authenticated_all_members" ON members;
DROP POLICY IF EXISTS "authenticated_all_debts" ON debts;
DROP POLICY IF EXISTS "profiles_own" ON profiles;
DROP POLICY IF EXISTS "profiles_super_admin_all" ON profiles;
DROP POLICY IF EXISTS "super_admin_all_synagogues" ON synagogues;

-- Synagogues
-- (משתמשים רגילים מצטרפים דרך רשימת בתי הכנסת)
CREATE POLICY "super_admin_insert_synagogue"
  ON synagogues FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

-- סופר אדמין יכול לעדכן ולמחוק
CREATE POLICY "super_admin_all_synagogues"
  ON synagogues FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_delete_synagogue"
  ON synagogues FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- קריאה: סופר אדמין רואה הכל, רגילים רואים רק את שלהם
CREATE POLICY "super_admin_read_synagogue"
  ON synagogues FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "admin_read_own_synagogue"
  ON synagogues FOR SELECT TO authenticated
  USING (id IN (SELECT synagogue_id FROM profiles WHERE user_id = auth.uid()::text));

-- Profiles: הרשאות גישה
-- INSERT: כל משתמש יכול ליצור פרופיל משלו
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- SELECT: רואה פרופיל משלו, סופר אדמין רואה הכל
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text OR public.is_super_admin());

-- UPDATE: יכול לעדכן פרופיל משלו, סופר אדמין יכול לעדכן הכל
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "profiles_update_super_admin"
  ON profiles FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- DELETE: סופר אדמין יכול למחוק כל פרופיל
CREATE POLICY "profiles_delete_super_admin"
  ON profiles FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- Members: קרא/כתוב רק של בית הכנסת שלך, או הכל אם סופר אדמין
CREATE POLICY "members_synagogue_access"
  ON members FOR ALL TO authenticated
  USING (
    synagogue_id IN (SELECT synagogue_id FROM profiles WHERE user_id = auth.uid()::text)
    OR public.is_super_admin()
  )
  WITH CHECK (
    synagogue_id IN (SELECT synagogue_id FROM profiles WHERE user_id = auth.uid()::text)
    OR public.is_super_admin()
  );

-- Debts: קרא/כתוב רק של בית הכנסת שלך, או הכל אם סופר אדמין
CREATE POLICY "debts_synagogue_access"
  ON debts FOR ALL TO authenticated
  USING (
    synagogue_id IN (SELECT synagogue_id FROM profiles WHERE user_id = auth.uid()::text)
    OR public.is_super_admin()
  )
  WITH CHECK (
    synagogue_id IN (SELECT synagogue_id FROM profiles WHERE user_id = auth.uid()::text)
    OR public.is_super_admin()
  );
