# Teacher dashboard setup

1. Run `supabase/migration_teacher_dashboard.sql` in the same Supabase project used by this app, after `migration_ohmjaa_penalties.sql`.
2. Create each teacher account in Supabase Authentication. Disable public sign-ups for this project if teachers are provisioned only by administrators.
3. Grant only the students that teacher may access. Example SQL (run as a database administrator):

   ```sql
   insert into public.teacher_student_access (teacher_id, student_id)
   select u.id, s.student_id
   from auth.users u cross join public.student_accounts s
   where u.email = 'teacher@example.com';
   ```

4. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the deployment environment.
5. Sign in at `/login` and verify the student roster, completion updates, discipline editing, and audit history.

The migration replaces the old public access policies for `ohmjaa_penalties` with teacher-only access. Review any separate student application that reads that table before applying it. It adds teacher policies to shared homework and student tables without removing their existing student policies. For full project-wide privacy, review those existing policies too.
