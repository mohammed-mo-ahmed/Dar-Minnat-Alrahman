-- Add section_id to profiles — so sheikh can see all students in their section

ALTER TABLE public.profiles
ADD COLUMN section_id uuid REFERENCES public.sections(id) ON DELETE SET NULL;

-- Backfill: copy section_id from students table for existing users
UPDATE public.profiles p
SET section_id = s.section_id
FROM public.students s
WHERE s.user_id = p.id AND s.section_id IS NOT NULL AND p.section_id IS NULL;
