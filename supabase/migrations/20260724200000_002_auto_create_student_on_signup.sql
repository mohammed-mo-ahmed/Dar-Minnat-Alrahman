-- Auto-create student record on auth signup

-- Add UNIQUE constraint on students.user_id
ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_user_id_key;
ALTER TABLE public.students ADD CONSTRAINT students_user_id_key UNIQUE (user_id);

-- Update trigger function to also insert into students
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
