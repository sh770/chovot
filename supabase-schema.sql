-- הרצה בסביבת SQL של Supabase (SQL Editor)
-- י tworz את הטבלאות ומגדיר הרשאות

-- טבלת מתפללים
CREATE TABLE members (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- טבלת חובות
CREATE TABLE debts (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  member_id BIGINT REFERENCES members(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- הפעלת Row Level Security
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE debts ENABLE ROW LEVEL SECURITY;

-- מדיניות: כל משתמש מחובר יכול לעשות הכל
CREATE POLICY "authenticated_all_members"
  ON members FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_all_debts"
  ON debts FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
