/*
  Allow students to see all students in their own group (leaderboard)

  Uses profiles.group_id instead of querying students directly
  to avoid RLS recursion.
*/

-- Add group_id to profiles (redundant with students.group_id but
-- allows RLS policies to check group membership without recursion)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;

-- Backfill from existing student records
UPDATE public.profiles p
SET group_id = s.group_id
FROM public.students s
WHERE s.user_id = p.id AND s.group_id IS NOT NULL;

-- Sync profiles.group_id when students.group_id changes
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
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_group_id();

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
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'student'
      AND p.group_id = students.group_id
  )
);
