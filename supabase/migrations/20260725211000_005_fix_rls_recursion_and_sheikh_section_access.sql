/*
  # Fix RLS recursion + sheikh section-wide access

  ## Problem 1 — Recursion
  `students_select_scoped` → `guardian_links` → `students` (infinite loop).
  Fix: SECURITY DEFINER helpers so the guardian_links policy never queries students directly.

  ## Problem 2 — Sheikh sees only his group students
  Policy only allowed students whose group.supervisor_id = auth.uid().
  Now also allows sheikh to see all students in the section stored on their profile.
*/

-- ============ HELPERS (SECURITY DEFINER — bypass RLS) ============

-- Check if current user is the owner (student) of a student record
CREATE OR REPLACE FUNCTION public.is_student_owner(student_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.students WHERE id = $1 AND user_id = auth.uid());
$$;

-- Get a student's group_id (avoids triggering RLS on students)
CREATE OR REPLACE FUNCTION public.get_student_group_id(student_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT group_id FROM public.students WHERE id = $1;
$$;

-- ============ FIX guardian_links policy (break recursion) ============
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

-- ============ FIX students policy (sheikh sees whole section) ============
DROP POLICY IF EXISTS "students_select_scoped" ON public.students;
CREATE POLICY "students_select_scoped"
ON public.students FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.get_role() = 'admin'
  OR EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = students.group_id AND g.supervisor_id = auth.uid()
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
  OR EXISTS (
    SELECT 1 FROM public.guardian_links gl
    WHERE gl.student_id = students.id AND gl.guardian_id = auth.uid() AND gl.status = 'approved'
  )
);

-- ============ FIX students UPDATE policy (sheikh can add/transfer in their section) ============
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
      -- Sheikh can only set group to one of their own groups (or unset it)
      students.group_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.groups g WHERE g.id = students.group_id AND g.supervisor_id = auth.uid()
      )
    )
  )
);
