-- ==========================================================
-- הרץ פעם אחת בסוף - מאחד את כל השינויים האחרונים
-- ==========================================================

-- 1. פונקציית עזר לחיפוש פרופיל לפי אימייל
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

-- 2. פונקציה להצגת רשימת בתי כנסת (ללא RLS) למשתמשים חדשים
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

-- 3. הוספת role='member' לטבלת profiles + עמודות חסרות
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'member'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_id BIGINT REFERENCES members(id) ON DELETE SET NULL;

-- 4. תשלום חלקי
ALTER TABLE debts ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;
UPDATE debts SET paid_amount = amount WHERE paid = true AND (paid_amount IS NULL OR paid_amount = 0);

-- 5. הגבלת יצירת בתי כנסת לסופר אדמין בלבד
DROP POLICY IF EXISTS "anyone_insert_synagogue" ON synagogues;
DROP POLICY IF EXISTS "super_admin_insert_synagogue" ON synagogues;
CREATE POLICY "super_admin_insert_synagogue"
  ON synagogues FOR INSERT TO authenticated
  WITH CHECK (public.is_super_admin());
