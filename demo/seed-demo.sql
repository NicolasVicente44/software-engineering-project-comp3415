-- GradPath P3 demo data
--
-- 1. Sign up a demo account in the app (e.g. gradpath.demo@<your-domain>).
-- 2. Put that email on the line marked EMAIL below.
-- 3. Run this whole file in the Supabase SQL editor.
--
-- Running it again RESETS the demo account: it deletes that one account's
-- courses and settings and re-inserts the data below. No other account is touched.
-- Every row here could also be entered through the app's own forms.

do $$
declare
    demo_email text := 'gradpath.demo@example.com';  -- EMAIL: change this
    demo_id uuid;
begin
    select id into demo_id from auth.users where email = demo_email;
    if demo_id is null then
        raise exception 'No user with email %. Sign up in the app first.', demo_email;
    end if;

    delete from public.student_courses where user_id = demo_id;
    delete from public.student_settings where user_id = demo_id;

    insert into public.student_courses (user_id, course_name, course_code, credits, status, prerequisites) values
        -- completed history
        (demo_id, 'Introduction to Programming',   'COMP-1411', 0.5, 'completed',   '{}'),
        (demo_id, 'Programming II',                'COMP-1412', 0.5, 'completed',   '{COMP-1411}'),
        (demo_id, 'Discrete Mathematics',          'MATH-1271', 0.5, 'completed',   '{}'),
        (demo_id, 'Academic Writing',              'ENGL-1012', 0.5, 'completed',   '{}'),
        -- current term (prerequisites already completed)
        (demo_id, 'Software Development',          'COMP-2477', 0.5, 'in_progress', '{COMP-1412}'),
        (demo_id, 'Web Programming',               'COMP-2130', 0.5, 'in_progress', '{COMP-1411}'),
        (demo_id, 'Linear Algebra',                'MATH-2111', 0.5, 'in_progress', '{}'),
        (demo_id, 'Introductory Statistics',       'STAT-1250', 0.5, 'in_progress', '{}'),
        -- failed, must retake (builds the prerequisite chain in the plan)
        (demo_id, 'Data Structures',               'COMP-2412', 0.5, 'failed',      '{COMP-1412}'),
        (demo_id, 'Algorithms',                    'COMP-3413', 0.5, 'failed',      '{COMP-2412,MATH-1271}'),
        (demo_id, 'Software Engineering',          'COMP-3415', 0.5, 'failed',      '{COMP-2412,COMP-2477}'),
        -- dropped, ignored by the planner
        (demo_id, 'Introduction to Philosophy',    'PHIL-1100', 0.5, 'dropped',     '{}');

    insert into public.student_settings (user_id, credit_limit) values (demo_id, 2.5);
end $$;
