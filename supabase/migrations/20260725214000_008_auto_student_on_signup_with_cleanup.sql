/*
  # Auto-create student on signup + delete on role upgrade

  Reverses part of migration 6:
  - handle_new_user: re-adds INSERT INTO students (removed in migration 6)
  - sync_student_on_role_change: also DELETEs student record when role
    changes from 'student' to 'sheikh' or 'guardian'
*/

-- 1. Signup trigger: create profile + student record
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

-- 2. Role-change trigger: create when → student, delete when ← student
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
  ELSIF OLD.role = 'student' AND NEW.role != 'student' THEN
    DELETE FROM public.students WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
