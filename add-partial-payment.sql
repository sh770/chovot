-- ==========================================================
-- הוספת תמיכה בתשלום חלקי לחובות + תאריך עברי
-- הרץ פעם אחת ב-Supabase SQL Editor
-- ==========================================================

-- 1. הוספת עמודת paid_amount לחישוב תשלום חלקי
ALTER TABLE debts ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2) DEFAULT 0;

-- 2. עדכון נתונים קיימים: חובות שסומנו כשולם מלא
UPDATE debts SET paid_amount = amount WHERE paid = true AND (paid_amount IS NULL OR paid_amount = 0);
