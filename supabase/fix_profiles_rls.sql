-- Create a security definer helper to check role without RLS recursion
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

-- Fix SELECT policy
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.get_role() IN ('admin', 'sheikh')
);

-- Fix UPDATE policy
DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id OR public.get_role() = 'admin')
WITH CHECK (auth.uid() = id OR public.get_role() = 'admin');
