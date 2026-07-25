/*
  # Clean up students table — remove redundancy

  1. Remove auto-create from signup trigger (handle_new_user)
  2. Add trigger: when profile role changes to 'student', auto-create record
  3. Add index on profiles.section_id for performance

  Note: existing student records for non-students are kept (they contain
  real data like name, phone, photo from complete-profile).
*/

-- Remove student auto-create from signup trigger
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

-- 2. Trigger: auto-create student record when role changes TO student
-- (Does NOT auto-delete when role changes FROM student — data is kept)
CREATE OR REPLACE FUNCTION public.sync_student_on_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'student' AND (OLD.role IS NULL OR OLD.role != 'student') THEN
    INSERT INTO public.students (full_name, user_id)
    VALUES (COALESCE(NEW.display_name, NEW.email, 'طالب'), NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_student_on_role_change ON public.profiles;
CREATE TRIGGER trg_sync_student_on_role_change
AFTER UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_on_role_change();

-- 3. Index on profiles.section_id (used by sheikh section queries)
CREATE INDEX IF NOT EXISTS idx_profiles_section_id ON public.profiles(section_id);
