-- ==============================================================================
-- OHMJAA & KANBANN M.2/3 - LATEST COMPLETE SUPABASE MIGRATION (ฉบับล่าสุด 2026)
-- Description: สคริปต์ SQL รวมทุกตารางที่จำเป็นสำหรับระบบโอมจ๋า ม.2/3
--              รองรับทั้งระบบบันทึกวินัย, กระดานการบ้าน, การบันทึกสถานะรายคน,
--              และระบบรายงาน พร้อมเปิดสิทธิ์ RLS ให้ทำงานได้ราบรื่น (Anon & Auth)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ตารางข้อมูลนักเรียน (student_accounts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_accounts (
    student_id text PRIMARY KEY,
    student_no integer NOT NULL,
    prefix text NOT NULL DEFAULT 'ด.ช.',
    first_name text NOT NULL,
    last_name text NOT NULL,
    nickname text,
    full_name text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_accounts_student_no ON public.student_accounts (student_no);
CREATE INDEX IF NOT EXISTS idx_student_accounts_name ON public.student_accounts (first_name, last_name);

ALTER TABLE public.student_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read student_accounts" ON public.student_accounts;
CREATE POLICY "Public read student_accounts" ON public.student_accounts
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage student_accounts" ON public.student_accounts;
CREATE POLICY "Public manage student_accounts" ON public.student_accounts
    FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. ตารางการบ้านและงานที่มอบหมาย (homework_tasks)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.homework_tasks (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    subject text NOT NULL,
    details text NOT NULL,
    due_date date NOT NULL,
    teacher_name text,
    status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    work_type text DEFAULT 'individual',
    submission_method text,
    image_url text,
    image_urls jsonb,
    created_by text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_homework_tasks_due_date ON public.homework_tasks (due_date ASC);
CREATE INDEX IF NOT EXISTS idx_homework_tasks_subject ON public.homework_tasks (subject);

ALTER TABLE public.homework_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read homework_tasks" ON public.homework_tasks;
CREATE POLICY "Public read homework_tasks" ON public.homework_tasks
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage homework_tasks" ON public.homework_tasks;
CREATE POLICY "Public manage homework_tasks" ON public.homework_tasks
    FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 3. ตารางสถานะส่งการบ้านรายคน (student_task_completions)
--    สำหรับกระดานติดตามการบ้าน (เขียว: ส่งแล้ว, แดง: ค้างส่ง, ส้ม: ส่งกลับ/กำลังทำ)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_task_completions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id text NOT NULL,
    task_id text NOT NULL,
    status text NOT NULL DEFAULT 'done' CHECK (status IN ('todo', 'in_progress', 'done')),
    completed_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT uq_student_task UNIQUE (student_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_completions_student ON public.student_task_completions (student_id);
CREATE INDEX IF NOT EXISTS idx_completions_task ON public.student_task_completions (task_id);
CREATE INDEX IF NOT EXISTS idx_completions_status ON public.student_task_completions (status);

ALTER TABLE public.student_task_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read student_task_completions" ON public.student_task_completions;
CREATE POLICY "Public read student_task_completions" ON public.student_task_completions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage student_task_completions" ON public.student_task_completions;
CREATE POLICY "Public manage student_task_completions" ON public.student_task_completions
    FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 4. ตารางบันทึกวินัยและบทลงโทษ (ohmjaa_penalties)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ohmjaa_penalties (
    id text PRIMARY KEY,
    student_id text NOT NULL,
    student_no integer NOT NULL,
    student_name text NOT NULL,
    student_nickname text,
    severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'strict')),
    severity_title text NOT NULL,
    incident text NOT NULL,
    punishment text NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'forgiven')),
    follow_up_note text NOT NULL DEFAULT '',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    updated_by uuid
);

CREATE INDEX IF NOT EXISTS idx_ohmjaa_penalties_student_id ON public.ohmjaa_penalties (student_id);
CREATE INDEX IF NOT EXISTS idx_ohmjaa_penalties_created_at ON public.ohmjaa_penalties (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ohmjaa_penalties_status ON public.ohmjaa_penalties (status);

ALTER TABLE public.ohmjaa_penalties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read ohmjaa_penalties" ON public.ohmjaa_penalties;
CREATE POLICY "Public read ohmjaa_penalties" ON public.ohmjaa_penalties
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert ohmjaa_penalties" ON public.ohmjaa_penalties;
CREATE POLICY "Public insert ohmjaa_penalties" ON public.ohmjaa_penalties
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update ohmjaa_penalties" ON public.ohmjaa_penalties;
CREATE POLICY "Public update ohmjaa_penalties" ON public.ohmjaa_penalties
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public delete ohmjaa_penalties" ON public.ohmjaa_penalties;
CREATE POLICY "Public delete ohmjaa_penalties" ON public.ohmjaa_penalties
    FOR DELETE USING (true);

-- ------------------------------------------------------------------------------
-- 5. ตารางประวัติการตรวจสอบย้อนหลัง (teacher_audit_log)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.teacher_audit_log (
    id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    teacher_id uuid,
    actor_email text NOT NULL DEFAULT 'system',
    action text NOT NULL,
    entity text NOT NULL,
    entity_id text NOT NULL,
    student_id text NOT NULL,
    before_data jsonb,
    after_data jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_audit_log_student ON public.teacher_audit_log (student_id, created_at DESC);

ALTER TABLE public.teacher_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read teacher_audit_log" ON public.teacher_audit_log;
CREATE POLICY "Public read teacher_audit_log" ON public.teacher_audit_log
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert teacher_audit_log" ON public.teacher_audit_log;
CREATE POLICY "Public insert teacher_audit_log" ON public.teacher_audit_log
    FOR INSERT WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- สิ้นสุดการตั้งค่าฐานข้อมูล
-- ------------------------------------------------------------------------------

