-- the student's saved academic plan (us-05)
-- run this in the Supabase SQL editor before using the saved plan;
-- it is safe to run more than once
alter table public.student_settings
    add column if not exists saved_plan jsonb;
