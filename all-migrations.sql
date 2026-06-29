-- ==========================================================
-- הרץ פעם אחת בסוף - מאחד את כל השינויים האחרונים
-- סדר הפעולות חשוב!
-- ==========================================================

-- 1. קודם מוסיפים עמודות חסרות לטבלאות קיימות (חייב לפני הפונקציות)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_id BIGINT REFERENCES members(id) ON DELETE SET NULL;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'member'));

ALTER TABLE debts ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;
UPDATE debts SET paid_amount = amount WHERE paid = true AND (paid_amount IS NULL OR paid_amount = 0);

-- 2. פונקציות SECURITY DEFINER (אחרי שהעמודות קיימות)
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

-- פונקציה לחיבור חשבון קיים - מעדכנת user_id בפרופיל (ללא RLS)
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

-- 3. הגבלת יצירת בתי כנסת לסופר אדמין בלבד
DROP POLICY IF EXISTS "anyone_insert_synagogue" ON synagogues;
DROP POLICY IF EXISTS "super_admin_insert_synagogue" ON synagogues;
CREATE POLICY "super_admin_insert_synagogue"
  ON synagogues FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());

-- 4. הפעלת RLS (במידה ועדיין לא הופעל)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;
