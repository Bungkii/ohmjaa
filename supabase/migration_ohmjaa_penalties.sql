-- ==============================================================================
-- MIGRATION: ohmjaa_penalties table
-- Description: Stores student disciplinary and penalty records for Ohmjaa & Kanbann M.2/3
-- ==============================================================================

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
    created_at timestamp with time zone DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ohmjaa_penalties_student_id ON public.ohmjaa_penalties (student_id);
CREATE INDEX IF NOT EXISTS idx_ohmjaa_penalties_created_at ON public.ohmjaa_penalties (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ohmjaa_penalties_severity ON public.ohmjaa_penalties (severity);

-- Row Level Security (RLS)
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

