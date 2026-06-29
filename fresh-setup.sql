-- ==========================================================
-- fresh-setup.sql
-- הרץ הכל בפעם אחת ב-Supabase SQL Editor לשרת חדש
-- כולל: טבלאות, פונקציות, אינדקסים, RLS, מדיניות
-- ==========================================================

-- ==========================================================
-- 1. טבלאות (סדר חשוב: תלויות קודמות)
-- ==========================================================

-- 1א. בתי כנסת
CREATE TABLE IF NOT EXISTS synagogues (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1ב. מתפללים (תלוי ב-synagogues)
CREATE TABLE IF NOT EXISTS members (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  synagogue_id BIGINT REFERENCES synagogues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1ג. חובות (תלוי ב-members)
CREATE TABLE IF NOT EXISTS debts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id BIGINT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  synagogue_id BIGINT REFERENCES synagogues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1ד. פרופילים (תלוי ב-synagogues AND members)
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


-- ==========================================================
-- 2. פונקציות SECURITY DEFINER (עוקפות RLS)
-- ==========================================================

-- 2א. בדיקת סופר אדמין (מונעת recursion בפוליסיס)
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

-- 2ב. חיפוש פרופיל לפי אימייל (למשתמשים חדשים שמתחברים לפרופיל קיים)
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

-- 2ג. הצגת רשימת בתי כנסת (למשתמשים חדשים בהרשמה)
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

-- 2ד. חיבור חשבון קיים - מעדכנת user_id בפרופיל (לאחר הרשמת מנהל)
CREATE OR REPLACE FUNCTION public.link_my_account(target_email TEXT, new_user_id TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET user_id = new_user_id
  WHERE email = target_email
    AND (user_id IS NULL OR user_id = '' OR user_id LIKE 'pending_%');
$$;

-- 2ה. יצירת פרופיל חבר ע"י מנהל (יוצרת גישת התחברות אישית למתפלל)
CREATE OR REPLACE FUNCTION public.create_member_profile(
  p_email TEXT,
  p_name TEXT,
  p_member_id BIGINT,
  p_synagogue_id BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_synagogue_id BIGINT;
  v_caller_role TEXT;
  v_new_profile_id BIGINT;
BEGIN
  -- בדוק שהקורא הוא מנהל או סופר אדמין
  SELECT synagogue_id, role INTO v_caller_synagogue_id, v_caller_role
  FROM profiles
  WHERE user_id = auth.uid()::text
    AND (role = 'admin' OR role = 'super_admin')
    AND synagogue_id IS NOT NULL;

  IF v_caller_synagogue_id IS NULL THEN
    RAISE EXCEPTION 'רק מנהלים יכולים ליצור גישת התחברות';
  END IF;

  -- סופר אדמין יכול ליצור לכל בית כנסת, מנהל רגיל רק לבית הכנסת שלו
  IF v_caller_synagogue_id != p_synagogue_id AND v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'ניתן ליצור גישה רק למתפללים בבית הכנסת שלך';
  END IF;

  -- בדוק אם כבר קיים פרופיל עם האימייל הזה
  IF EXISTS (SELECT 1 FROM profiles WHERE email = p_email) THEN
    RAISE EXCEPTION 'כבר קיים פרופיל עם האימייל הזה';
  END IF;

  -- צור פרופיל חבר
  INSERT INTO profiles (user_id, email, name, synagogue_id, member_id, role)
  VALUES ('pending_' || extract(epoch from now()), p_email, p_name, p_synagogue_id, p_member_id, 'member')
  RETURNING id INTO v_new_profile_id;

  RETURN v_new_profile_id;
END;
$$;


-- ==========================================================
-- 3. אינדקסים
-- ==========================================================

CREATE INDEX IF NOT EXISTS idx_members_synagogue ON members(synagogue_id);
CREATE INDEX IF NOT EXISTS idx_debts_member ON debts(member_id);
CREATE INDEX IF NOT EXISTS idx_debts_synagogue ON debts(synagogue_id);
CREATE INDEX IF NOT EXISTS idx_profiles_user ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_synagogue ON profiles(synagogue_id);


-- ==========================================================
-- 4. הפעלת Row Level Security (RLS)
-- ==========================================================

ALTER TABLE synagogues ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;


-- ==========================================================
-- 5. מחיקת מדיניות ישנה (למקרה שמריצים שוב על DB קיים)
-- ==========================================================

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_super_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_super_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_own" ON profiles;
DROP POLICY IF EXISTS "profiles_super_admin_all" ON profiles;
-- synagogues
DROP POLICY IF EXISTS "anyone_insert_synagogue" ON synagogues;
DROP POLICY IF EXISTS "super_admin_insert_synagogue" ON synagogues;
DROP POLICY IF EXISTS "super_admin_all_synagogues" ON synagogues;
DROP POLICY IF EXISTS "super_admin_delete_synagogue" ON synagogues;
DROP POLICY IF EXISTS "super_admin_read_synagogue" ON synagogues;
DROP POLICY IF EXISTS "admin_read_own_synagogue" ON synagogues;
-- members
DROP POLICY IF EXISTS "members_synagogue_access" ON members;
DROP POLICY IF EXISTS "authenticated_all_members" ON members;
-- debts
DROP POLICY IF EXISTS "debts_synagogue_access" ON debts;
DROP POLICY IF EXISTS "authenticated_all_debts" ON debts;


-- ==========================================================
-- 6. מדיניות RLS (פוליסיס)
-- ==========================================================

-- 6א. synagogues
CREATE POLICY "super_admin_insert_synagogue"
  ON synagogues FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_all_synagogues"
  ON synagogues FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_delete_synagogue"
  ON synagogues FOR DELETE TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "super_admin_read_synagogue"
  ON synagogues FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE POLICY "admin_read_own_synagogue"
  ON synagogues FOR SELECT TO authenticated
  USING (id IN (SELECT synagogue_id FROM profiles WHERE user_id = auth.uid()::text));

-- 6ב. profiles
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid()::text OR public.is_super_admin());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "profiles_update_super_admin"
  ON profiles FOR UPDATE TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY "profiles_delete_super_admin"
  ON profiles FOR DELETE TO authenticated
  USING (public.is_super_admin());

-- 6ג. members
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

-- 6ד. debts
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


-- ==========================================================
-- 7. ניקוי נתוני עבר (למקרה שהרצה על DB קיים)
-- ==========================================================

-- עדכון חובות קיימים: העתקת amount ל-paid_amount עבור חובות ששולמו במלואם
UPDATE debts
SET paid_amount = amount
WHERE paid = true AND (paid_amount IS NULL OR paid_amount = 0);


-- ==========================================================
-- סיום! השרת מוכן.
-- ==========================================================
