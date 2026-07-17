-- Socials on profiles + trainers, weight goal, and personal records.
-- Applied to the live DB on 2026-07-17 via the Supabase connector.
alter table public.profiles add column if not exists socials jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists weight_goal numeric(5,1);
alter table public.trainers add column if not exists socials jsonb not null default '{}'::jsonb;

create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  lift text not null,
  value numeric(6,2) not null,
  unit text not null default 'kg',
  achieved_at date not null default current_date,
  created_at timestamptz not null default now(),
  unique (client_id, lift)
);
alter table public.personal_records enable row level security;
create policy "prs own" on public.personal_records for all
  using (client_id = auth.uid()) with check (client_id = auth.uid());
