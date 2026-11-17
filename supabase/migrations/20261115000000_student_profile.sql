-- student profile details and degree goal (us-11)
-- run this in the Supabase SQL editor before using the Profile page;
-- it is safe to run more than once
alter table public.student_settings
    add column if not exists full_name text
        check (char_length(full_name) <= 100),
    add column if not exists school text
        check (char_length(school) <= 100),
    add column if not exists program text
        check (char_length(program) <= 100),
    add column if not exists credits_to_graduate numeric
        check (credits_to_graduate > 0 and credits_to_graduate <= 100);
