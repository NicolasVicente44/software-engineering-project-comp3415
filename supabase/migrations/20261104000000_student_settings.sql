-- per-student planner settings (us-06)
-- run this in the Supabase SQL editor before using the credit limit setting;
-- it is safe to run more than once
create table if not exists public.student_settings (
    user_id uuid primary key references auth.users (id) on delete cascade,
    credit_limit numeric not null default 2.5
        check (credit_limit > 0 and credit_limit <= 10),
    updated_at timestamptz not null default now()
);

alter table public.student_settings enable row level security;

-- students can only read and change their own settings
drop policy if exists "Students can read their own settings" on public.student_settings;
create policy "Students can read their own settings"
    on public.student_settings for select
    using (auth.uid() = user_id);

drop policy if exists "Students can add their own settings" on public.student_settings;
create policy "Students can add their own settings"
    on public.student_settings for insert
    with check (auth.uid() = user_id);

drop policy if exists "Students can update their own settings" on public.student_settings;
create policy "Students can update their own settings"
    on public.student_settings for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
