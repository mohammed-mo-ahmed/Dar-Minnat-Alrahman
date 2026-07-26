/*
  Allow students to see all students in their own group (leaderboard)
*/

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
      WHERE p.id = auth.uid() AND p.section_id = students.section_id
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.guardian_links gl
    WHERE gl.student_id = students.id AND gl.guardian_id = auth.uid() AND gl.status = 'approved'
  )
  OR EXISTS (
    SELECT 1 FROM public.students s2
    WHERE s2.user_id = auth.uid()
      AND s2.group_id IS NOT NULL
      AND s2.group_id = students.group_id
  )
);
