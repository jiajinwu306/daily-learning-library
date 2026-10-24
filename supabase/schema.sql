-- 在 Supabase SQL Editor 中执行。生产环境请先关闭公开注册，再创建个人账号。
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('excel', 'psychology', 'law')),
  title text not null check (length(trim(title)) > 0),
  body text not null check (length(trim(body)) > 0),
  source_url text,
  learned_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_date_idx
  on public.notes (user_id, learned_on desc, created_at desc);

alter table public.notes enable row level security;
revoke all on public.notes from anon;
grant select, insert, update, delete on public.notes to authenticated;

create policy "Read own notes" on public.notes
  for select to authenticated using (auth.uid() = user_id);

create policy "Create own notes" on public.notes
  for insert to authenticated with check (auth.uid() = user_id);

create policy "Update own notes" on public.notes
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Delete own notes" on public.notes
  for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_notes_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_updated_at
  before update on public.notes
  for each row execute function public.set_notes_updated_at();
