/*
  #10 — مُشَخِّص + تصحيح جميع RLS و triggers

  1. Diagnostics — يعرض عدّادات البيانات + الـ policies الحالية
  2. تصحيح — يضمن وجود كل الأعمدة المطلوبة ويُعيد إنشاء
     كل الـ RLS policies والفنكشنز والـ triggers

  شغّل هذا الملف كاملاً في SQL Editor (مرة واحدة).
*/

-- ============================================================
-- 1. DIAGNOSTICS
-- ============================================================

-- عدّادات البيانات للتأكّد من وجودها
SELECT 'data_count' AS section;
SELECT 'sections' AS tbl, count(*) FROM public.sections
UNION ALL
SELECT 'groups', count(*) FROM public.groups
UNION ALL
SELECT 'students', count(*) FROM public.students
UNION ALL
SELECT 'profiles', count(*) FROM public.profiles;

-- الأعمدة الموجودة في profiles
SELECT 'profiles_columns' AS section;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- الـ policies الحالية على students و guardian_links
SELECT 'current_policies' AS section;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('students','guardian_links','profiles')
ORDER BY tablename, policyname;

-- الفنكشنز والـ triggers
SELECT 'functions_triggers' AS section;
SELECT proname, prosrc
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('get_role','handle_new_user','is_student_owner','get_student_group_id','sync_student_on_role_change','sync_profile_group_id','check_user_exists_by_email','check_user_exists_by_phone','award_points')
ORDER BY proname;

SELECT 'triggers' AS section;
SELECT trigger_name, event_manipulation, event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY trigger_name;

-- ============================================================
-- 2. FIX — ضمان وجود الأعمدة المطلوبة في profiles
-- ============================================================

SELECT '=== FIX START ===' AS section;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;

-- Backfill section_id من students
UPDATE public.profiles p
SET section_id = s.section_id
FROM public.students s
WHERE s.user_id = p.id AND s.section_id IS NOT NULL AND p.section_id IS NULL;

-- Backfill group_id من students
UPDATE public.profiles p
SET group_id = s.group_id
FROM public.students s
WHERE s.user_id = p.id AND s.group_id IS NOT NULL;

-- ============================================================
-- 3. FIX — الفنكشنز الأساسية
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT role FROM public.profiles WHERE id = auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.is_student_owner(student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.students WHERE id = student_id AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.get_student_group_id(student_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM public.students WHERE id = student_id;
$$;

CREATE OR REPLACE FUNCTION public.check_user_exists_by_email(email_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE email = email_to_check);
END;
$$;

CREATE OR REPLACE FUNCTION public.check_user_exists_by_phone(phone_to_check text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE phone = phone_to_check);
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_user_exists_by_email(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_exists_by_phone(text) TO anon, authenticated;

-- ============================================================
-- 4. FIX — triggers
-- ============================================================

-- auto-create profile on signup (WITH student auto-create)
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

  INSERT INTO public.students (full_name, user_id)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- sync student record on role change
CREATE OR REPLACE FUNCTION public.sync_student_on_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'student' AND OLD.role IS DISTINCT FROM 'student' THEN
    INSERT INTO public.students (full_name, user_id)
    VALUES (COALESCE(NEW.display_name, NEW.email, 'طالب'), NEW.id)
    ON CONFLICT DO NOTHING;
  ELSIF OLD.role = 'student' AND NEW.role IS DISTINCT FROM 'student' THEN
    DELETE FROM public.students WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_on_role_change ON public.profiles;
CREATE TRIGGER trg_sync_student_on_role_change
AFTER UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_student_on_role_change();

-- sync profiles.group_id when students.group_id changes
CREATE OR REPLACE FUNCTION public.sync_profile_group_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.profiles SET group_id = NULL WHERE id = OLD.user_id;
    RETURN OLD;
  ELSE
    UPDATE public.profiles SET group_id = NEW.group_id WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_profile_group_id ON public.students;
CREATE TRIGGER trg_sync_profile_group_id
AFTER INSERT OR UPDATE OF group_id OR DELETE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.sync_profile_group_id();

-- ============================================================
-- 5. FIX — RLS على profiles
-- ============================================================

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.get_role() IN ('admin', 'sheikh')
);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.get_role() = 'admin')
WITH CHECK (auth.uid() = id OR public.get_role() = 'admin');

-- ============================================================
-- 6. FIX — RLS على sections
-- ============================================================

DROP POLICY IF EXISTS "sections_select_all" ON public.sections;
CREATE POLICY "sections_select_all"
ON public.sections FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sections_modify_admin" ON public.sections;
CREATE POLICY "sections_modify_admin"
ON public.sections FOR ALL TO authenticated
USING (public.get_role() = 'admin')
WITH CHECK (public.get_role() = 'admin');

-- ============================================================
-- 7. FIX — RLS على groups
-- ============================================================

DROP POLICY IF EXISTS "groups_select_all" ON public.groups;
CREATE POLICY "groups_select_all"
ON public.groups FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "groups_modify_admin" ON public.groups;
CREATE POLICY "groups_modify_admin"
ON public.groups FOR ALL TO authenticated
USING (public.get_role() = 'admin')
WITH CHECK (public.get_role() = 'admin');

DROP POLICY IF EXISTS "groups_update_supervisor" ON public.groups;
CREATE POLICY "groups_update_supervisor"
ON public.groups FOR UPDATE TO authenticated
USING (auth.uid() = supervisor_id)
WITH CHECK (auth.uid() = supervisor_id);

-- ============================================================
-- 8. FIX — RLS على students (الـ SELECT هي اللي كانت فيها المشكلة)
-- ============================================================

DROP POLICY IF EXISTS "students_select_scoped" ON public.students;
CREATE POLICY "students_select_scoped"
ON public.students FOR SELECT TO authenticated
USING (
  -- الطالب يشوف نفسه
  user_id = auth.uid()

  -- المدير يشوف الكل
  OR public.get_role() = 'admin'

  -- المشرف يشوف طلاب مجموعته
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = students.group_id AND g.supervisor_id = auth.uid()
  )

  -- الشيخ يشوف كل طلاب قسمه (حتى لو مفيش section_id في البروفايل)
  OR (
    public.get_role() = 'sheikh'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.section_id = students.section_id
          OR (
            p.section_id IS NULL
            AND EXISTS (
              SELECT 1 FROM public.groups g
              WHERE g.supervisor_id = auth.uid()
                AND g.section_id = students.section_id
            )
          )
        )
    )
  )

  -- ولي الأمر يشوف أولاده
  OR EXISTS (
    SELECT 1 FROM public.guardian_links gl
    WHERE gl.student_id = students.id AND gl.guardian_id = auth.uid() AND gl.status = 'approved'
  )

  -- الطالب يشوف زملاء مجموعته في لوحة الصدارة
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'student'
      AND p.group_id = students.group_id
  )
);

DROP POLICY IF EXISTS "students_insert_admin_or_sheikh" ON public.students;
CREATE POLICY "students_insert_admin_or_sheikh"
ON public.students FOR INSERT TO authenticated
WITH CHECK (
  public.get_role() IN ('admin', 'sheikh')
);

DROP POLICY IF EXISTS "students_update_admin_or_sheikh_or_self" ON public.students;
CREATE POLICY "students_update_admin_or_sheikh_or_self"
ON public.students FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR public.get_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.groups g WHERE g.id = students.group_id AND g.supervisor_id = auth.uid()
  )
  OR (
    public.get_role() = 'sheikh'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.section_id = students.section_id
          OR (
            p.section_id IS NULL
            AND EXISTS (
              SELECT 1 FROM public.groups g
              WHERE g.supervisor_id = auth.uid()
                AND g.section_id = students.section_id
            )
          )
        )
    )
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR public.get_role() = 'admin'
  OR (
    public.get_role() = 'sheikh'
    AND (
      students.group_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.groups g WHERE g.id = students.group_id AND g.supervisor_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "students_delete_admin" ON public.students;
CREATE POLICY "students_delete_admin"
ON public.students FOR DELETE TO authenticated
USING (public.get_role() = 'admin');

-- ============================================================
-- 9. FIX — RLS على guardian_links (كان فيها recursion أصلًا)
-- ============================================================

DROP POLICY IF EXISTS "glinks_select_scoped" ON public.guardian_links;
CREATE POLICY "glinks_select_scoped"
ON public.guardian_links FOR SELECT TO authenticated
USING (
  guardian_id = auth.uid()
  OR public.get_role() = 'admin'
  OR public.is_student_owner(guardian_links.student_id)
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = public.get_student_group_id(guardian_links.student_id)
      AND g.supervisor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "glinks_insert_admin" ON public.guardian_links;
CREATE POLICY "glinks_insert_admin"
ON public.guardian_links FOR INSERT TO authenticated
WITH CHECK (public.get_role() = 'admin');

DROP POLICY IF EXISTS "glinks_update_admin" ON public.guardian_links;
CREATE POLICY "glinks_update_admin"
ON public.guardian_links FOR UPDATE TO authenticated
USING (public.get_role() = 'admin')
WITH CHECK (public.get_role() = 'admin');

DROP POLICY IF EXISTS "glinks_delete_admin" ON public.guardian_links;
CREATE POLICY "glinks_delete_admin"
ON public.guardian_links FOR DELETE TO authenticated
USING (public.get_role() = 'admin');

-- ============================================================
-- 10. FIX — بقية الـ RLS policies (attendance, الخ)
-- ============================================================

-- ATTENDANCE
DROP POLICY IF EXISTS "attendance_select_scoped" ON public.attendance;
CREATE POLICY "attendance_select_scoped"
ON public.attendance FOR SELECT TO authenticated
USING (
  public.get_role() = 'admin'
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
  public.get_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = attendance.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "attendance_update_admin_or_sheikh" ON public.attendance;
CREATE POLICY "attendance_update_admin_or_sheikh"
ON public.attendance FOR UPDATE TO authenticated
USING (
  public.get_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = attendance.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
)
WITH CHECK (
  public.get_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = attendance.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "attendance_delete_admin_or_sheikh" ON public.attendance;
CREATE POLICY "attendance_delete_admin_or_sheikh"
ON public.attendance FOR DELETE TO authenticated
USING (
  public.get_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = attendance.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

-- ACTIVITIES
DROP POLICY IF EXISTS "activities_select_all" ON public.activities;
CREATE POLICY "activities_select_all"
ON public.activities FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "activities_modify_admin_or_sheikh" ON public.activities;
CREATE POLICY "activities_modify_admin_or_sheikh"
ON public.activities FOR ALL TO authenticated
USING (public.get_role() IN ('admin', 'sheikh'))
WITH CHECK (public.get_role() IN ('admin', 'sheikh'));

-- ACTIVITY PARTICIPANTS
DROP POLICY IF EXISTS "participants_select_scoped" ON public.activity_participants;
CREATE POLICY "participants_select_scoped"
ON public.activity_participants FOR SELECT TO authenticated
USING (
  public.get_role() = 'admin'
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
USING (public.get_role() IN ('admin', 'sheikh'))
WITH CHECK (public.get_role() IN ('admin', 'sheikh'));

-- FINANCE
DROP POLICY IF EXISTS "finance_select_scoped" ON public.finance_transactions;
CREATE POLICY "finance_select_scoped"
ON public.finance_transactions FOR SELECT TO authenticated
USING (
  public.get_role() = 'admin'
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
  public.get_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = finance_transactions.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "finance_update_admin" ON public.finance_transactions;
CREATE POLICY "finance_update_admin"
ON public.finance_transactions FOR UPDATE TO authenticated
USING (public.get_role() = 'admin')
WITH CHECK (public.get_role() = 'admin');

DROP POLICY IF EXISTS "finance_delete_admin" ON public.finance_transactions;
CREATE POLICY "finance_delete_admin"
ON public.finance_transactions FOR DELETE TO authenticated
USING (public.get_role() = 'admin');

-- EXAMS
DROP POLICY IF EXISTS "exams_select_scoped" ON public.exams;
CREATE POLICY "exams_select_scoped"
ON public.exams FOR SELECT TO authenticated
USING (
  public.get_role() = 'admin'
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
  public.get_role() IN ('admin', 'sheikh')
);

DROP POLICY IF EXISTS "exams_update_admin_or_sheikh" ON public.exams;
CREATE POLICY "exams_update_admin_or_sheikh"
ON public.exams FOR UPDATE TO authenticated
USING (
  public.get_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = exams.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "exams_delete_admin_or_sheikh" ON public.exams;
CREATE POLICY "exams_delete_admin_or_sheikh"
ON public.exams FOR DELETE TO authenticated
USING (
  public.get_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = exams.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

-- REWARDS
DROP POLICY IF EXISTS "rewards_select_all" ON public.rewards;
CREATE POLICY "rewards_select_all"
ON public.rewards FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "rewards_modify_admin" ON public.rewards;
CREATE POLICY "rewards_modify_admin"
ON public.rewards FOR ALL TO authenticated
USING (public.get_role() = 'admin')
WITH CHECK (public.get_role() = 'admin');

-- REWARD REDEMPTIONS
DROP POLICY IF EXISTS "redemptions_select_scoped" ON public.reward_redemptions;
CREATE POLICY "redemptions_select_scoped"
ON public.reward_redemptions FOR SELECT TO authenticated
USING (
  public.get_role() = 'admin'
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
  public.get_role() IN ('admin', 'sheikh')
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = reward_redemptions.student_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "redemptions_update_admin" ON public.reward_redemptions;
CREATE POLICY "redemptions_update_admin"
ON public.reward_redemptions FOR UPDATE TO authenticated
USING (public.get_role() = 'admin')
WITH CHECK (public.get_role() = 'admin');

DROP POLICY IF EXISTS "redemptions_delete_admin" ON public.reward_redemptions;
CREATE POLICY "redemptions_delete_admin"
ON public.reward_redemptions FOR DELETE TO authenticated
USING (public.get_role() = 'admin');

-- POINT TRANSACTIONS
DROP POLICY IF EXISTS "points_select_scoped" ON public.point_transactions;
CREATE POLICY "points_select_scoped"
ON public.point_transactions FOR SELECT TO authenticated
USING (
  public.get_role() = 'admin'
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
  public.get_role() IN ('admin', 'sheikh')
  OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = point_transactions.student_id AND s.user_id = auth.uid())
);

DROP POLICY IF EXISTS "points_delete_admin_or_sheikh" ON public.point_transactions;
CREATE POLICY "points_delete_admin_or_sheikh"
ON public.point_transactions FOR DELETE TO authenticated
USING (
  public.get_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.students s, public.groups g
    WHERE s.id = point_transactions.student_id AND g.id = s.group_id AND g.supervisor_id = auth.uid()
  )
);

-- GUARDIAN REQUESTS
DROP POLICY IF EXISTS "grequests_select_own_or_admin" ON public.guardian_requests;
CREATE POLICY "grequests_select_own_or_admin"
ON public.guardian_requests FOR SELECT TO authenticated
USING (
  guardian_id = auth.uid()
  OR public.get_role() = 'admin'
);

DROP POLICY IF EXISTS "grequests_insert_own" ON public.guardian_requests;
CREATE POLICY "grequests_insert_own"
ON public.guardian_requests FOR INSERT TO authenticated
WITH CHECK (guardian_id = auth.uid());

DROP POLICY IF EXISTS "grequests_update_admin" ON public.guardian_requests;
CREATE POLICY "grequests_update_admin"
ON public.guardian_requests FOR UPDATE TO authenticated
USING (public.get_role() = 'admin')
WITH CHECK (public.get_role() = 'admin');

DROP POLICY IF EXISTS "grequests_delete_own_or_admin" ON public.guardian_requests;
CREATE POLICY "grequests_delete_own_or_admin"
ON public.guardian_requests FOR DELETE TO authenticated
USING (
  guardian_id = auth.uid()
  OR public.get_role() = 'admin'
);

-- ============================================================
-- 11. INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_section_id ON public.profiles(section_id);
CREATE INDEX IF NOT EXISTS idx_profiles_group_id ON public.profiles(group_id);
CREATE INDEX IF NOT EXISTS idx_students_group ON public.students(group_id);
CREATE INDEX IF NOT EXISTS idx_students_user ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_section ON public.students(section_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_date ON public.attendance(student_id, session_date);
CREATE INDEX IF NOT EXISTS idx_finance_student_month ON public.finance_transactions(student_id, month_key);
CREATE INDEX IF NOT EXISTS idx_points_student ON public.point_transactions(student_id);
CREATE INDEX IF NOT EXISTS idx_exams_student ON public.exams(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_participants_activity ON public.activity_participants(activity_id);
CREATE INDEX IF NOT EXISTS idx_guardian_links_guardian ON public.guardian_links(guardian_id);

-- Partial unique index on phone (ignore NULLs)
DROP INDEX IF EXISTS idx_profiles_phone_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique ON public.profiles(phone) WHERE phone IS NOT NULL;

-- ============================================================
-- 12. AWARD POINTS FUNCTION
-- ============================================================

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

-- ============================================================
-- DONE
-- ============================================================

SELECT '=== FIX COMPLETE ===' AS section;

-- عدّ البيانات مرة أخرى بعد الإصلاح
SELECT 'data_after_fix' AS section;
SELECT 'sections' AS tbl, count(*) FROM public.sections
UNION ALL
SELECT 'groups', count(*) FROM public.groups
UNION ALL
SELECT 'students', count(*) FROM public.students
UNION ALL
SELECT 'profiles', count(*) FROM public.profiles;

-- عرض الـ policies الجديدة على students + guardian_links
SELECT 'new_policies' AS section;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('students','guardian_links','profiles')
ORDER BY tablename, policyname;
