-- Prevent duplicate phone numbers across profiles
-- Partial index so multiple NULLs are allowed (ignored)

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_phone_unique
ON public.profiles(phone)
WHERE phone IS NOT NULL;
