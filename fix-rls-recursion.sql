-- ==========================================================
-- תיקון: infinite recursion בפוליסיס של טבלת profiles
--
-- הבעיה: הפוליסיס profiles_select_own עושה
--   SELECT 1 FROM profiles WHERE ...
-- בתוך תת-שאילתה, מה שמפעיל שוב את אותה הפוליסיס
-- ויוצר לולאה אינסופית.
--
-- פתרון: פונקציית SECURITY DEFINER שבודקת הרשאות super_admin
-- בלי RLS, כך שאין recursion.
--
-- הרץ את כל הסקריפט פעם אחת ב-Supabase SQL Editor.
-- ==========================================================

-- 1. פונקציית עזר שבודקת אם המשתמש הנוכחי הוא super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles
    WHERE user_id = auth.uid()::text
      AND role = 'super_admin'
  );
$$;

-- 2. מחיקת כל הפוליסיס הישנים (חובה לפני CREATE מחדש)
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
-- members & debts
DROP POLICY IF EXISTS "members_synagogue_access" ON members;
DROP POLICY IF EXISTS "authenticated_all_members" ON members;
DROP POLICY IF EXISTS "debts_synagogue_access" ON debts;
DROP POLICY IF EXISTS "authenticated_all_debts" ON debts;

-- 3. פוליסיס חדשים לטבלת profiles (ללא recursion)
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()::text
    OR public.is_super_admin()
  );

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

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

-- 4. פוליסיס לטבלת synagogues (באמצעות הפונקציה)
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

-- 5. פוליסיס לטבלאות members ו-debts (באמצעות הפונקציה)
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
