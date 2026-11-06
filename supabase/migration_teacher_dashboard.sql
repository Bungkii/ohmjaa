-- Run after migration_ohmjaa_penalties.sql. Create teacher users in Supabase Auth,
-- then grant each teacher access with an INSERT into teacher_student_access.
create table if not exists public.teacher_student_access (
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id text not null,
  primary key (teacher_id, student_id)
);

alter table public.teacher_student_access enable row level security;
create policy "Teachers read own access" on public.teacher_student_access
  for select to authenticated using (teacher_id = (select auth.uid()));

create policy "Teachers read assigned students" on public.student_accounts
  for select to authenticated using (
    exists (select 1 from public.teacher_student_access a
      where a.teacher_id = (select auth.uid()) and a.student_id = student_accounts.student_id)
  );

create policy "Teachers read homework" on public.homework_tasks
  for select to authenticated using (
    exists (select 1 from public.teacher_student_access a where a.teacher_id = (select auth.uid()))
  );

alter table public.ohmjaa_penalties
  add column if not exists follow_up_note text not null default '',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by uuid references auth.users(id);

drop policy if exists "Allow public read access on ohmjaa_penalties" on public.ohmjaa_penalties;
drop policy if exists "Allow authenticated/anon insert on ohmjaa_penalties" on public.ohmjaa_penalties;
drop policy if exists "Allow authenticated/anon manage on ohmjaa_penalties" on public.ohmjaa_penalties;

create policy "Teachers read assigned discipline" on public.ohmjaa_penalties
  for select to authenticated using (
    exists (select 1 from public.teacher_student_access a
      where a.teacher_id = (select auth.uid()) and a.student_id = ohmjaa_penalties.student_id)
  );
create policy "Teachers add assigned discipline" on public.ohmjaa_penalties
  for insert to authenticated with check (
    exists (select 1 from public.teacher_student_access a
      where a.teacher_id = (select auth.uid()) and a.student_id = ohmjaa_penalties.student_id)
  );
create policy "Teachers update assigned discipline" on public.ohmjaa_penalties
  for update to authenticated using (
    exists (select 1 from public.teacher_student_access a
      where a.teacher_id = (select auth.uid()) and a.student_id = ohmjaa_penalties.student_id)
  ) with check (
    exists (select 1 from public.teacher_student_access a
      where a.teacher_id = (select auth.uid()) and a.student_id = ohmjaa_penalties.student_id)
  );
create policy "Teachers delete assigned discipline" on public.ohmjaa_penalties
  for delete to authenticated using (
    exists (select 1 from public.teacher_student_access a
      where a.teacher_id = (select auth.uid()) and a.student_id = ohmjaa_penalties.student_id)
  );

-- These policies add teacher rights to the shared student system without
-- removing policies that its existing student workflows may rely on.
create policy "Teachers read assigned completions" on public.student_task_completions
  for select to authenticated using (
    exists (select 1 from public.teacher_student_access a
      where a.teacher_id = (select auth.uid()) and a.student_id = student_task_completions.student_id)
  );
create policy "Teachers add assigned completions" on public.student_task_completions
  for insert to authenticated with check (
    exists (select 1 from public.teacher_student_access a
      where a.teacher_id = (select auth.uid()) and a.student_id = student_task_completions.student_id)
  );
create policy "Teachers update assigned completions" on public.student_task_completions
  for update to authenticated using (
    exists (select 1 from public.teacher_student_access a
      where a.teacher_id = (select auth.uid()) and a.student_id = student_task_completions.student_id)
  ) with check (
    exists (select 1 from public.teacher_student_access a
      where a.teacher_id = (select auth.uid()) and a.student_id = student_task_completions.student_id)
  );

create table if not exists public.teacher_task_reviews (
  teacher_id uuid not null references auth.users(id) on delete cascade,
  student_id text not null,
  task_id text not null,
  reviewed_at timestamptz not null default now(),
  primary key (teacher_id, student_id, task_id)
);
alter table public.teacher_task_reviews enable row level security;
create policy "Teachers read own reviews" on public.teacher_task_reviews
  for select to authenticated using (teacher_id = (select auth.uid()));
create policy "Teachers add own reviews" on public.teacher_task_reviews
  for insert to authenticated with check (
    teacher_id = (select auth.uid()) and exists (
      select 1 from public.teacher_student_access a
      where a.teacher_id = (select auth.uid()) and a.student_id = teacher_task_reviews.student_id)
  );
create policy "Teachers update own reviews" on public.teacher_task_reviews
  for update to authenticated using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));
create policy "Teachers remove own reviews" on public.teacher_task_reviews
  for delete to authenticated using (teacher_id = (select auth.uid()));

create table if not exists public.teacher_audit_log (
  id bigint generated always as identity primary key,
  teacher_id uuid not null references auth.users(id),
  actor_email text not null,
  action text not null,
  entity text not null,
  entity_id text not null,
  student_id text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);
create index if not exists teacher_audit_log_student_idx on public.teacher_audit_log (student_id, created_at desc);
alter table public.teacher_audit_log enable row level security;
create policy "Teachers read assigned audit" on public.teacher_audit_log
  for select to authenticated using (
    exists (select 1 from public.teacher_student_access a
      where a.teacher_id = (select auth.uid()) and a.student_id = teacher_audit_log.student_id)
  );

create or replace function public.log_teacher_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  row_data jsonb;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  if auth.uid() is not null and exists (
    select 1 from public.teacher_student_access a
    where a.teacher_id = auth.uid() and a.student_id = row_data->>'student_id'
  ) then
    insert into public.teacher_audit_log
      (teacher_id, actor_email, action, entity, entity_id, student_id, before_data, after_data)
    values
      (auth.uid(), coalesce(auth.jwt()->>'email', 'unknown'), lower(tg_op), tg_table_name,
       coalesce(row_data->>'id', row_data->>'student_id' || ':' || row_data->>'task_id'), row_data->>'student_id',
       case when tg_op = 'INSERT' then null else to_jsonb(old) end,
       case when tg_op = 'DELETE' then null else to_jsonb(new) end);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_teacher_penalties on public.ohmjaa_penalties;
create trigger audit_teacher_penalties after insert or update or delete on public.ohmjaa_penalties
  for each row execute function public.log_teacher_change();
drop trigger if exists audit_teacher_completions on public.student_task_completions;
create trigger audit_teacher_completions after insert or update or delete on public.student_task_completions
  for each row execute function public.log_teacher_change();
drop trigger if exists audit_teacher_reviews on public.teacher_task_reviews;
create trigger audit_teacher_reviews after insert or update or delete on public.teacher_task_reviews
  for each row execute function public.log_teacher_change();
