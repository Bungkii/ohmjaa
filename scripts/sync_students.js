const fs = require('fs');

const rows = JSON.parse(fs.readFileSync('C:/Users/BUNGKII/Downloads/student_accounts_rows.json', 'utf8'));

// 1. Update src/data/students.json
const ohmjaaStudents = rows.map((r) => ({
  student_id: String(r.student_id),
  student_no: Number(r.student_no),
  prefix: r.prefix || '',
  first_name: r.first_name || '',
  last_name: r.last_name || '',
  nickname: r.nickname || '',
  full_name: r.full_name || `${r.prefix}${r.first_name} ${r.last_name}`,
}));

fs.writeFileSync('src/data/students.json', JSON.stringify(ohmjaaStudents, null, 2) + '\n', 'utf8');
console.log('Updated src/data/students.json successfully (' + ohmjaaStudents.length + ' students)');

// 2. Generate Supabase SQL Migration
function esc(val) {
  if (val === null || val === undefined) return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

let sql = `-- ==============================================================================
-- OHMJAA: LATEST STUDENT ACCOUNTS SEED (ห้อง ม.2/3 รวม 53 คน)
-- Source: C:\\Users\\BUNGKII\\Downloads\\student_accounts_rows.json
-- Generated: 2026-11-13
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_accounts (
    student_id text PRIMARY KEY,
    student_no integer NOT NULL,
    prefix text NOT NULL DEFAULT 'ด.ช.',
    first_name text NOT NULL,
    last_name text NOT NULL,
    nickname text,
    full_name text,
    role text DEFAULT 'Student',
    password_hash text,
    is_first_login boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
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

-- Upsert 53 student accounts
INSERT INTO public.student_accounts (
    student_id, student_no, prefix, first_name, last_name, nickname, full_name, role, password_hash, is_first_login, is_active, created_at, updated_at
) VALUES
`;

const lines = rows.map((r) => {
  const sId = esc(r.student_id);
  const sNo = Number(r.student_no);
  const prefix = esc(r.prefix);
  const fName = esc(r.first_name);
  const lName = esc(r.last_name);
  const nick = esc(r.nickname);
  const full = esc(r.full_name || `${r.prefix}${r.first_name} ${r.last_name}`);
  const role = esc(r.role || 'Student');
  const pass = esc(r.password_hash);
  const isFirst = r.is_first_login !== false ? 'true' : 'false';
  const isActive = r.is_active !== false ? 'true' : 'false';
  const createdAt = esc(r.created_at || new Date().toISOString());
  const updatedAt = esc(r.updated_at || new Date().toISOString());

  return `  (${sId}, ${sNo}, ${prefix}, ${fName}, ${lName}, ${nick}, ${full}, ${role}, ${pass}, ${isFirst}, ${isActive}, ${createdAt}, ${updatedAt})`;
});

sql += lines.join(',\n') + `\nON CONFLICT (student_id) DO UPDATE SET
    student_no = EXCLUDED.student_no,
    prefix = EXCLUDED.prefix,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    nickname = EXCLUDED.nickname,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    password_hash = COALESCE(EXCLUDED.password_hash, public.student_accounts.password_hash),
    is_first_login = EXCLUDED.is_first_login,
    is_active = EXCLUDED.is_active,
    updated_at = now();
`;

fs.writeFileSync('supabase/migration_seed_students_latest.sql', sql, 'utf8');
console.log('Generated supabase/migration_seed_students_latest.sql successfully');
