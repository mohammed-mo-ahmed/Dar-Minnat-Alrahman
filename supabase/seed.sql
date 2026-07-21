-- Seed: Dar Minat Al-Rahman test data
-- Prerequisite: 20260720204858_001_initial_schema.sql must be run first.
-- Run this in Supabase SQL Editor (uses service_role – safe only for local/dev).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. AUTH USERS  (trigger auto-creates profiles with role=student)
-- ============================================================

-- Admin
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated',
  'admin@test.com',
  crypt('Test123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin User"}',
  now(), now(), '', '', '', ''
);

-- Sheikh
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000002',
  'authenticated', 'authenticated',
  'sheikh@test.com',
  crypt('Test123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Sheikh Ahmed"}',
  now(), now(), '', '', '', ''
);

-- Guardian
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, email_change, email_change_token_new, recovery_token)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000003',
  'authenticated', 'authenticated',
  'guardian@test.com',
  crypt('Test123!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Guardian Khaled"}',
  now(), now(), '', '', '', ''
);

-- ============================================================
-- 2. UPDATE PROFILES  (override default 'student' role)
-- ============================================================

UPDATE public.profiles SET role = 'admin'   WHERE id = 'a0000000-0000-0000-0000-000000000001';
UPDATE public.profiles SET role = 'sheikh'  WHERE id = 'a0000000-0000-0000-0000-000000000002';
UPDATE public.profiles SET role = 'guardian'WHERE id = 'a0000000-0000-0000-0000-000000000003';

-- ============================================================
-- 3. SECTION
-- ============================================================

INSERT INTO public.sections (id, name, gender)
VALUES ('b0000000-0000-0000-0000-000000000001', 'الفرقة الأولى', 'male');

-- ============================================================
-- 4. GROUP  (supervised by sheikh)
-- ============================================================

INSERT INTO public.groups (id, name, section_id, supervisor_id,
  finance_type, fee_mode, monthly_fee)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'حلقة الفجر',
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000002',
  'subscription', 'per_student', 50.00
);

-- ============================================================
-- 5. STUDENT  (linked to guardian)
-- ============================================================

INSERT INTO public.students (id, full_name, user_id, group_id, points_balance)
VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'عبد الرحمن خالد',
  'a0000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000001',
  120
);

-- ============================================================
-- 6. GUARDIAN LINK  (guardian → student)
-- ============================================================

INSERT INTO public.guardian_links (id, student_id, guardian_id, status)
VALUES (
  'e0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000003',
  'approved'
);

-- ============================================================
-- 7. SAMPLE ATTENDANCE  (past 5 days)
-- ============================================================

INSERT INTO public.attendance (student_id, group_id, session_date, status, memorized, created_by)
SELECT
  'd0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000001',
  d,
  CASE (row_number() OVER ())::int % 4
    WHEN 0 THEN 'absent_unexcused'
    WHEN 1 THEN 'present_memorized'
    WHEN 2 THEN 'present_not_memorized'
    ELSE 'absent_excused'
  END,
  (row_number() OVER ())::int % 3 <> 0,
  'a0000000-0000-0000-0000-000000000002'
FROM generate_series(CURRENT_DATE - 4, CURRENT_DATE, '1 day'::interval) d;

-- ============================================================
-- 8. SAMPLE FINANCE  (current month)
-- ============================================================

INSERT INTO public.finance_transactions (student_id, month_key, type, amount, description, created_by)
VALUES
  ('d0000000-0000-0000-0000-000000000001', to_char(CURRENT_DATE, 'YYYY-MM'), 'subscription', 50.00, 'اشتراك شهري', 'a0000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000001', to_char(CURRENT_DATE, 'YYYY-MM'), 'absence_deduction', 10.00, 'خصم غياب', 'a0000000-0000-0000-0000-000000000002');

-- ============================================================
-- 9. SAMPLE REWARDS + REDEMPTION
-- ============================================================

INSERT INTO public.rewards (id, name, description, points_cost)
VALUES ('f0000000-0000-0000-0000-000000000001', 'هدية بسيطة', 'مفاجأة صغيرة', 50);

INSERT INTO public.reward_redemptions (student_id, reward_id, status)
VALUES ('d0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'issued');

-- ============================================================
-- 10. SAMPLE ACTIVITY
-- ============================================================

INSERT INTO public.activities (id, type, title, description, activity_date, cost_per_person, total_cost, created_by)
VALUES (
  'a0000000-0000-0000-0001-000000000001',
  'trip',
  'رحلة إلى الحديقة',
  'رحلة ترفيهية للحفظة المتميزين',
  CURRENT_DATE + 7,
  25.00,
  100.00,
  'a0000000-0000-0000-0000-000000000002'
);

INSERT INTO public.activity_participants (activity_id, student_id, paid, amount)
VALUES ('a0000000-0000-0000-0001-000000000001', 'd0000000-0000-0000-0000-000000000001', false, 25.00);
