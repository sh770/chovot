-- ==========================================================
-- תמיכה במשתמשים מסוג "מתפלל" (member) + קישור פרופיל למתפלל
-- הרץ פעם אחת ב-Supabase SQL Editor
-- ==========================================================

-- 1. שינוי CHECK constraint בטבלת profiles להוספת role='member'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('super_admin', 'admin', 'member'));

-- 2. הוספת עמודת member_id לפרופילים (קישור לטבלת members)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS member_id BIGINT REFERENCES members(id) ON DELETE SET NULL;

-- 3. פונקציה להצגת רשימת בתי כנסת (ללא RLS) למשתמשים חדשים
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
