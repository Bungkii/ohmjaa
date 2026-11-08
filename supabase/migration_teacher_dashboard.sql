-- ==============================================================================
-- MIGRATION: teacher dashboard, audit logs, and disciplinary tracking (LATEST)
-- ==============================================================================

-- 1. Ensure columns exist on ohmjaa_penalties
ALTER TABLE public.ohmjaa_penalties
  ADD COLUMN IF NOT EXISTS follow_up_note text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by uuid;

-- 2. Ensure RLS policies allow seamless read/write (both Anon and Authenticated)
ALTER TABLE public.ohmjaa_penalties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on ohmjaa_penalties" ON public.ohmjaa_penalties;
CREATE POLICY "Allow public read access on ohmjaa_penalties" ON public.ohmjaa_penalties
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated/anon insert on ohmjaa_penalties" ON public.ohmjaa_penalties;
CREATE POLICY "Allow authenticated/anon insert on ohmjaa_penalties" ON public.ohmjaa_penalties
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated/anon manage on ohmjaa_penalties" ON public.ohmjaa_penalties;
CREATE POLICY "Allow authenticated/anon manage on ohmjaa_penalties" ON public.ohmjaa_penalties
  FOR ALL USING (true) WITH CHECK (true);

-- 3. Ensure student_task_completions table and policies
CREATE TABLE IF NOT EXISTS public.student_task_completions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id text NOT NULL,
  task_id text NOT NULL,
  status text NOT NULL DEFAULT 'done' CHECK (status IN ('todo', 'in_progress', 'done')),
  completed_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_student_task UNIQUE (student_id, task_id)
);

ALTER TABLE public.student_task_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on student_task_completions" ON public.student_task_completions;
CREATE POLICY "Allow public read access on student_task_completions" ON public.student_task_completions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated/anon manage on student_task_completions" ON public.student_task_completions;
CREATE POLICY "Allow authenticated/anon manage on student_task_completions" ON public.student_task_completions
  FOR ALL USING (true) WITH CHECK (true);

-- 4. Teacher audit log table
CREATE TABLE IF NOT EXISTS public.teacher_audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  teacher_id uuid,
  actor_email text NOT NULL DEFAULT 'ครูประจำชั้น ม.2/3',
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text NOT NULL,
  student_id text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teacher_audit_log_student_idx ON public.teacher_audit_log (student_id, created_at DESC);
ALTER TABLE public.teacher_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on teacher_audit_log" ON public.teacher_audit_log;
CREATE POLICY "Allow public read on teacher_audit_log" ON public.teacher_audit_log
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert on teacher_audit_log" ON public.teacher_audit_log;
CREATE POLICY "Allow public insert on teacher_audit_log" ON public.teacher_audit_log
  FOR INSERT WITH CHECK (true);
