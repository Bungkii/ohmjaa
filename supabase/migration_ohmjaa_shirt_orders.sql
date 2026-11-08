-- =========================================================================
-- Migration: Create ohmjaa_shirt_orders table for parent shirt ordering
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.ohmjaa_shirt_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id TEXT NOT NULL UNIQUE,
    student_no INTEGER DEFAULT 0,
    student_name TEXT NOT NULL,
    student_nickname TEXT,
    size TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    custom_size TEXT,
    unit_price NUMERIC(10, 2) DEFAULT 250.00,
    total_price NUMERIC(10, 2) DEFAULT 250.00,
    parent_name TEXT,
    parent_phone TEXT,
    note TEXT,
    slip_url TEXT,
    status TEXT DEFAULT 'pending', -- pending, paid, verified, cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.ohmjaa_shirt_orders ENABLE ROW LEVEL SECURITY;

-- Allow anonymous & authenticated reads and writes (for parent self-service form)
CREATE POLICY "Allow public read shirt orders"
ON public.ohmjaa_shirt_orders
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public insert/update shirt orders"
ON public.ohmjaa_shirt_orders
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Index for fast lookup by student_id and student_no
CREATE INDEX IF NOT EXISTS idx_shirt_orders_student_id ON public.ohmjaa_shirt_orders (student_id);
CREATE INDEX IF NOT EXISTS idx_shirt_orders_student_no ON public.ohmjaa_shirt_orders (student_no);

