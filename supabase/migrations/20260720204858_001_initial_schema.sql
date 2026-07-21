/*
# Dar Minat Al-Rahman — Initial Schema

## Overview
Full schema for the Smart Quran Memorization School Management System.
Supports: users/roles, sections, groups, students, attendance, finance,
points/rewards/exams, activities (trips + football), guardian requests.

## Tables
1. `profiles` — extends auth.users with role (admin/sheikh/guardian/student).
2. `sections` — شباب / سيدات.
3. `groups` — belongs to a section, has a supervisor, finance_type, fee_mode, monthly_fee.
4. `guardian_links` — approved guardian↔student links (created before students due to FK cycle in policies).
5. `students` — student records linked to a group.
6. `attendance` — per-session attendance with status + memorized flag.
7. `activities` — trips or football bookings.
8. `activity_participants` — students participating in an activity + paid flag.
9. `finance_transactions` — monthly ledger entries per student.
10. `exams` — exam records per student.
11. `rewards` — catalog of redeemable rewards.
12. `reward_redemptions` — redemption log.
13. `point_transactions` — ledger of point awards (cumulative, no reset).
14. `guardian_requests` — guardian link requests (free-text student name).

## Security
- RLS enabled on every table.
- All policies use `auth.uid()`.
- Scoped access via ownership chains (student→group→sheikh, student→guardian_link).
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'student'
    CHECK (role IN ('admin','sheikh','guardian','student')),
  display_name text,
  phone text,
  email text,
  photo_url text,
  profile_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'sheikh')
);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (auth.uid() = id OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ SECTIONS ============
CREATE TABLE IF NOT EXISTS public.sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  gender text NOT NULL DEFAULT 'male' CHECK (gender IN ('male','female')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sections_select_all" ON public.sections;
CREATE POLICY "sections_select_all"
ON public.sections FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sections_modify_admin" ON public.sections;
CREATE POLICY "sections_modify_admin"
ON public.sections FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ GROUPS ============
CREATE TABLE IF NOT EXISTS public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  name text NOT NULL,
  supervisor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  finance_type text NOT NULL DEFAULT 'none'
    CHECK (finance_type IN ('deduction','subscription','none')),
  fee_mode text NOT NULL DEFAULT 'per_student'
    CHECK (fee_mode IN ('per_student','per_group')),
  monthly_fee numeric(10,2) NOT NULL DEFAULT 0,
  deduction_amount numeric(10,2) NOT NULL DEFAULT 50,
  no_memorization_deduction numeric(10,2) NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "groups_select_all" ON public.groups;
CREATE POLICY "groups_select_all"
ON public.groups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "groups_modify_admin" ON public.groups;
CREATE POLICY "groups_modify_admin"
ON public.groups FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "groups_update_supervisor" ON public.groups;
CREATE POLICY "groups_update_supervisor"
ON public.groups FOR UPDATE TO authenticated
USING (auth.uid() = supervisor_id)
WITH CHECK (auth.uid() = supervisor_id);

-- ============ GUARDIAN LINKS (approved) — created before students ============
CREATE TABLE IF NOT EXISTS public.guardian_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,  -- FK added after students table
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved','revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guardian_id, student_id)
);
ALTER TABLE public.guardian_links ENABLE ROW LEVEL SECURITY;

-- ============ STUDENTS ============
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  student_phone text,
  guardian_phone text,
  address text,
  section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  current_memorization text,
  last_memorized text,
  next_assignment text,
  evaluation text,
  points_balance integer NOT NULL DEFAULT 0,
  subscription_amount numeric(10,2) NOT NULL DEFAULT 0,
  photo_url text,
  join_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Now add the FK from guardian_links.student_id to students
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'guardian_links_student_id_fkey' AND table_name = 'guardian_links'
  ) THEN
    ALTER TABLE public.guardian_links
      ADD CONSTRAINT guardian_links_student_id_fkey
      FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "students_select_scoped" ON public.students;
CREATE POLICY "students_select_scoped"
ON public.students FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = students.group_id AND g.supervisor_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.guardian_links gl
    WHERE gl.student_id = students.id AND gl.guardian_id = auth.uid() AND gl.status = 'approved'
  )
);

DROP POLICY IF EXISTS "students_insert_admin_or_sheikh" ON public.students;
CREATE POLICY "students_insert_admin_or_sheikh"
ON public.students FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','sheikh'))
);

DROP POLICY IF EXISTS "students_update_admin_or_sheikh_or_self" ON public.students;
CREATE POLICY "students_update_admin_or_sheikh_or_self"
ON public.students FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = students.group_id AND g.supervisor_id = auth.uid()
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = students.group_id AND g.supervisor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "students_delete_admin" ON public.students;
CREATE POLICY "students_delete_admin"
ON public.students FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- guardian_links policies (now that students exists)
DROP POLICY IF EXISTS "glinks_select_scoped" ON public.guardian_links;
CREATE POLICY "glinks_select_scoped"
ON public.guardian_links FOR SELECT TO authenticated
USING (
  guardian_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = guardian_links.student_id AND s.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = guardian_links.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "glinks_insert_admin" ON public.guardian_links;
CREATE POLICY "glinks_insert_admin"
ON public.guardian_links FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "glinks_update_admin" ON public.guardian_links;
CREATE POLICY "glinks_update_admin"
ON public.guardian_links FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "glinks_delete_admin" ON public.guardian_links;
CREATE POLICY "glinks_delete_admin"
ON public.guardian_links FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ ATTENDANCE ============
CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'present_memorized'
    CHECK (status IN ('present_memorized','present_not_memorized','absent_unexcused','absent_excused')),
  memorized boolean NOT NULL DEFAULT false,
  excuse_note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select_scoped" ON public.attendance;
CREATE POLICY "attendance_select_scoped"
ON public.attendance FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = attendance.student_id
    AND (s.user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = s.group_id AND g.supervisor_id = auth.uid())
         OR EXISTS (SELECT 1 FROM public.guardian_links gl WHERE gl.student_id = s.id AND gl.guardian_id = auth.uid() AND gl.status='approved'))
  )
);

DROP POLICY IF EXISTS "attendance_insert_admin_or_sheikh" ON public.attendance;
CREATE POLICY "attendance_insert_admin_or_sheikh"
ON public.attendance FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = attendance.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "attendance_update_admin_or_sheikh" ON public.attendance;
CREATE POLICY "attendance_update_admin_or_sheikh"
ON public.attendance FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = attendance.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = attendance.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "attendance_delete_admin_or_sheikh" ON public.attendance;
CREATE POLICY "attendance_delete_admin_or_sheikh"
ON public.attendance FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = attendance.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

-- ============ ACTIVITIES ============
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('trip','football')),
  title text NOT NULL,
  description text,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  cost_per_person numeric(10,2) NOT NULL DEFAULT 0,
  total_cost numeric(10,2) NOT NULL DEFAULT 0,
  capacity integer,
  location text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_select_all" ON public.activities;
CREATE POLICY "activities_select_all"
ON public.activities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "activities_modify_admin_or_sheikh" ON public.activities;
CREATE POLICY "activities_modify_admin_or_sheikh"
ON public.activities FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','sheikh'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','sheikh'))
);

-- ============ ACTIVITY PARTICIPANTS ============
CREATE TABLE IF NOT EXISTS public.activity_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  paid boolean NOT NULL DEFAULT false,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, student_id)
);
ALTER TABLE public.activity_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "participants_select_scoped" ON public.activity_participants;
CREATE POLICY "participants_select_scoped"
ON public.activity_participants FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = activity_participants.student_id
    AND (s.user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = s.group_id AND g.supervisor_id = auth.uid())
         OR EXISTS (SELECT 1 FROM public.guardian_links gl WHERE gl.student_id = s.id AND gl.guardian_id = auth.uid() AND gl.status='approved'))
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'sheikh'
  )
);

DROP POLICY IF EXISTS "participants_modify_admin_or_sheikh" ON public.activity_participants;
CREATE POLICY "participants_modify_admin_or_sheikh"
ON public.activity_participants FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','sheikh'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','sheikh'))
);

-- ============ FINANCE TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  month_key text NOT NULL,
  type text NOT NULL
    CHECK (type IN ('absence_deduction','no_memorization_deduction','subscription','activity_fee','payment','adjustment')),
  amount numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  ref_attendance_id uuid REFERENCES public.attendance(id) ON DELETE SET NULL,
  ref_activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "finance_select_scoped" ON public.finance_transactions;
CREATE POLICY "finance_select_scoped"
ON public.finance_transactions FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = finance_transactions.student_id
    AND (s.user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = s.group_id AND g.supervisor_id = auth.uid())
         OR EXISTS (SELECT 1 FROM public.guardian_links gl WHERE gl.student_id = s.id AND gl.guardian_id = auth.uid() AND gl.status='approved'))
  )
);

DROP POLICY IF EXISTS "finance_insert_admin_or_sheikh" ON public.finance_transactions;
CREATE POLICY "finance_insert_admin_or_sheikh"
ON public.finance_transactions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = finance_transactions.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "finance_update_admin" ON public.finance_transactions;
CREATE POLICY "finance_update_admin"
ON public.finance_transactions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "finance_delete_admin" ON public.finance_transactions;
CREATE POLICY "finance_delete_admin"
ON public.finance_transactions FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ EXAMS ============
CREATE TABLE IF NOT EXISTS public.exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  exam_date date NOT NULL DEFAULT CURRENT_DATE,
  subject text,
  score text,
  evaluation text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exams_select_scoped" ON public.exams;
CREATE POLICY "exams_select_scoped"
ON public.exams FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = exams.student_id
    AND (s.user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = s.group_id AND g.supervisor_id = auth.uid())
         OR EXISTS (SELECT 1 FROM public.guardian_links gl WHERE gl.student_id = s.id AND gl.guardian_id = auth.uid() AND gl.status='approved'))
  )
);

DROP POLICY IF EXISTS "exams_insert_admin_or_sheikh" ON public.exams;
CREATE POLICY "exams_insert_admin_or_sheikh"
ON public.exams FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','sheikh'))
);

DROP POLICY IF EXISTS "exams_update_admin_or_sheikh" ON public.exams;
CREATE POLICY "exams_update_admin_or_sheikh"
ON public.exams FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = exams.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "exams_delete_admin_or_sheikh" ON public.exams;
CREATE POLICY "exams_delete_admin_or_sheikh"
ON public.exams FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = exams.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

-- ============ REWARDS ============
CREATE TABLE IF NOT EXISTS public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  points_cost integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rewards_select_all" ON public.rewards;
CREATE POLICY "rewards_select_all"
ON public.rewards FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rewards_modify_admin" ON public.rewards;
CREATE POLICY "rewards_modify_admin"
ON public.rewards FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ REWARD REDEMPTIONS ============
CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES public.rewards(id) ON DELETE CASCADE,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','cancelled'))
);
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "redemptions_select_scoped" ON public.reward_redemptions;
CREATE POLICY "redemptions_select_scoped"
ON public.reward_redemptions FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = reward_redemptions.student_id
    AND (s.user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = s.group_id AND g.supervisor_id = auth.uid())
         OR EXISTS (SELECT 1 FROM public.guardian_links gl WHERE gl.student_id = s.id AND gl.guardian_id = auth.uid() AND gl.status='approved'))
  )
);

DROP POLICY IF EXISTS "redemptions_insert_admin_or_sheikh_or_self" ON public.reward_redemptions;
CREATE POLICY "redemptions_insert_admin_or_sheikh_or_self"
ON public.reward_redemptions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','sheikh'))
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = reward_redemptions.student_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "redemptions_update_admin" ON public.reward_redemptions;
CREATE POLICY "redemptions_update_admin"
ON public.reward_redemptions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "redemptions_delete_admin" ON public.reward_redemptions;
CREATE POLICY "redemptions_delete_admin"
ON public.reward_redemptions FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ============ POINT TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  points integer NOT NULL,
  reason text,
  source text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "points_select_scoped" ON public.point_transactions;
CREATE POLICY "points_select_scoped"
ON public.point_transactions FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s WHERE s.id = point_transactions.student_id
    AND (s.user_id = auth.uid()
         OR EXISTS (SELECT 1 FROM public.groups g WHERE g.id = s.group_id AND g.supervisor_id = auth.uid())
         OR EXISTS (SELECT 1 FROM public.guardian_links gl WHERE gl.student_id = s.id AND gl.guardian_id = auth.uid() AND gl.status='approved'))
  )
);

DROP POLICY IF EXISTS "points_insert_admin_or_sheikh" ON public.point_transactions;
CREATE POLICY "points_insert_admin_or_sheikh"
ON public.point_transactions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','sheikh'))
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = point_transactions.student_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "points_delete_admin_or_sheikh" ON public.point_transactions;
CREATE POLICY "points_delete_admin_or_sheikh"
ON public.point_transactions FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = point_transactions.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

-- ============ GUARDIAN REQUESTS ============
CREATE TABLE IF NOT EXISTS public.guardian_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_name_text text NOT NULL,
  extra_info text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_note text,
  resolved_student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.guardian_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grequests_select_own_or_admin" ON public.guardian_requests;
CREATE POLICY "grequests_select_own_or_admin"
ON public.guardian_requests FOR SELECT TO authenticated
USING (
  guardian_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "grequests_insert_own" ON public.guardian_requests;
CREATE POLICY "grequests_insert_own"
ON public.guardian_requests FOR INSERT TO authenticated
WITH CHECK (guardian_id = auth.uid());

DROP POLICY IF EXISTS "grequests_update_admin" ON public.guardian_requests;
CREATE POLICY "grequests_update_admin"
ON public.guardian_requests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

DROP POLICY IF EXISTS "grequests_delete_own_or_admin" ON public.guardian_requests;
CREATE POLICY "grequests_delete_own_or_admin"
ON public.guardian_requests FOR DELETE TO authenticated
USING (
  guardian_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_students_group ON public.students(group_id);
CREATE INDEX IF NOT EXISTS idx_students_user ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, session_date);
CREATE INDEX IF NOT EXISTS idx_finance_student_month ON public.finance_transactions(student_id, month_key);
CREATE INDEX IF NOT EXISTS idx_points_student ON public.point_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_exams_student ON public.exams(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_participants_activity ON public.activity_participants(activity_id);
CREATE INDEX IF NOT EXISTS idx_guardian_links_guardian ON public.guardian_links(guardian_id);

-- ============ TRIGGERS: auto-create profile on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ FUNCTION: award points + update balance ============
CREATE OR REPLACE FUNCTION public.award_points(
  p_student_id uuid,
  p_points integer,
  p_reason text,
  p_source text,
  p_created_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.point_transactions (student_id, points, reason, source, created_by)
  VALUES (p_student_id, p_points, p_reason, p_source, p_created_by);
  UPDATE public.students
  SET points_balance = points_balance + p_points,
      updated_at = now()
  WHERE id = p_student_id;
END;
$$;
