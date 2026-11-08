-- Weekly classroom duty: public display, administrator-managed writes.
-- Review the live schema and existing grants/policies before applying.
-- Populate rows from the Supabase SQL editor or another trusted admin path.

CREATE TABLE IF NOT EXISTS public.student_weekly_duty (
  student_id text PRIMARY KEY REFERENCES public.student_accounts(student_id) ON DELETE CASCADE,
  weekday text NOT NULL CHECK (weekday IN ('จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_weekly_duty ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read weekly duty" ON public.student_weekly_duty;
CREATE POLICY "Public read weekly duty"
  ON public.student_weekly_duty FOR SELECT TO anon, authenticated
  USING (true);

-- Do not grant INSERT/UPDATE/DELETE to web visitors. The table contains only
-- student IDs and weekdays; all writes must use administrator privileges.
REVOKE ALL ON public.student_weekly_duty FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.student_weekly_duty TO anon, authenticated;

-- Example, run as a database administrator after choosing a student's day:
-- INSERT INTO public.student_weekly_duty (student_id, weekday)
-- VALUES ('STUDENT_ID', 'จันทร์')
-- ON CONFLICT (student_id) DO UPDATE
-- SET weekday = EXCLUDED.weekday, updated_at = now();
