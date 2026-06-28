-- ==========================================================
-- הוספת פונקציה לחיפוש פרופיל לפי אי-מייל בלי RLS
-- נדרש כדי שמשתמש חדש יוכל להתחבר לפרופיל שנוצר ע"י המנהל
-- ==========================================================

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
