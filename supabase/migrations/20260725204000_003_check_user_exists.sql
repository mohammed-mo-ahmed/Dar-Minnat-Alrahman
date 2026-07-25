/*
  # Check if user exists by email or phone

  SECURITY DEFINER so anon users can call it during sign-in.
  Searches `public.profiles` (populated via trigger on auth.users insert).
*/

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
