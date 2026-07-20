-- FitConnect retention studio + Momentum Circles
-- Private trainer CRM data stays visible only to its trainer. Social challenge
-- rankings expose aliases and verified session counts, never body/health data.

create table public.trainer_client_records (
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  goal_summary text check (char_length(goal_summary) <= 600),
  private_notes text check (char_length(private_notes) <= 3000),
  tags text[] not null default '{}',
  relationship_status text not null default 'active'
    check (relationship_status in ('active', 'attention', 'paused')),
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trainer_id, client_id),
  check (cardinality(tags) <= 8)
);

create trigger trainer_client_records_updated
before update on public.trainer_client_records
for each row execute function public.set_updated_at();

alter table public.trainer_client_records enable row level security;
grant select, insert, update, delete on public.trainer_client_records to authenticated;

create policy "trainer crm read own relationships"
on public.trainer_client_records for select to authenticated
using (
  private.owns_trainer(trainer_id)
  and exists (
    select 1 from public.bookings b
    where b.trainer_id = trainer_client_records.trainer_id
      and b.client_id = trainer_client_records.client_id
      and b.status not in ('cancelled', 'no_show')
  )
);

create policy "trainer crm insert own relationships"
on public.trainer_client_records for insert to authenticated
with check (
  private.owns_trainer(trainer_id)
  and exists (
    select 1 from public.bookings b
    where b.trainer_id = trainer_client_records.trainer_id
      and b.client_id = trainer_client_records.client_id
      and b.status not in ('cancelled', 'no_show')
  )
);

create policy "trainer crm update own relationships"
on public.trainer_client_records for update to authenticated
using (private.owns_trainer(trainer_id))
with check (
  private.owns_trainer(trainer_id)
  and exists (
    select 1 from public.bookings b
    where b.trainer_id = trainer_client_records.trainer_id
      and b.client_id = trainer_client_records.client_id
      and b.status not in ('cancelled', 'no_show')
  )
);

create policy "trainer crm delete own relationships"
on public.trainer_client_records for delete to authenticated
using (private.owns_trainer(trainer_id));

create index trainer_client_records_follow_up_idx
on public.trainer_client_records (trainer_id, next_follow_up_at)
where next_follow_up_at is not null;

create table public.coach_nudges (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('rebook', 'check_in', 'celebrate')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 500),
  status text not null default 'sent' check (status in ('sent', 'seen', 'dismissed', 'acted')),
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

alter table public.coach_nudges enable row level security;
grant select, insert on public.coach_nudges to authenticated;

create policy "nudges read participants"
on public.coach_nudges for select to authenticated
using (client_id = (select auth.uid()) or private.owns_trainer(trainer_id));

create policy "trainers send nudges to real clients"
on public.coach_nudges for insert to authenticated
with check (
  private.owns_trainer(trainer_id)
  and exists (
    select 1 from public.bookings b
    where b.trainer_id = coach_nudges.trainer_id
      and b.client_id = coach_nudges.client_id
      and b.status not in ('cancelled', 'no_show')
  )
);

create index coach_nudges_client_created_idx
on public.coach_nudges (client_id, created_at desc);

create or replace function public.respond_to_coach_nudge(p_nudge uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('seen', 'dismissed', 'acted') then
    raise exception 'Invalid nudge status';
  end if;
  update public.coach_nudges
  set status = p_status,
      seen_at = case when p_status in ('seen', 'acted') then now() else seen_at end
  where id = p_nudge and client_id = (select auth.uid());
  if not found then raise exception 'Nudge unavailable'; end if;
end;
$$;
revoke all on function public.respond_to_coach_nudge(uuid, text) from public, anon;
grant execute on function public.respond_to_coach_nudge(uuid, text) to authenticated;

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  title_ar text not null,
  description text not null,
  description_ar text not null,
  kind text not null check (kind in ('solo', 'circle')),
  metric text not null default 'verified_sessions' check (metric = 'verified_sessions'),
  target integer not null check (target between 1 and 100),
  reward_xp integer not null check (reward_xp between 0 and 5000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  max_members integer check (max_members between 2 and 1000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check ((kind = 'solo' and max_members is null) or (kind = 'circle' and max_members is not null))
);

create table public.challenge_memberships (
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  display_alias text not null check (char_length(display_alias) between 2 and 32),
  progress integer not null default 0 check (progress >= 0),
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (challenge_id, client_id)
);

alter table public.challenges enable row level security;
alter table public.challenge_memberships enable row level security;
grant select on public.challenges to anon, authenticated;
grant select, delete on public.challenge_memberships to authenticated;

create policy "active challenges are discoverable"
on public.challenges for select to anon, authenticated
using (active = true);

create policy "memberships read own"
on public.challenge_memberships for select to authenticated
using (client_id = (select auth.uid()));

create policy "memberships leave own"
on public.challenge_memberships for delete to authenticated
using (client_id = (select auth.uid()));

create or replace function public.join_challenge(p_challenge uuid, p_alias text)
returns public.challenge_memberships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_challenge public.challenges%rowtype;
  v_members integer;
  v_progress integer;
  v_result public.challenge_memberships%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if char_length(btrim(p_alias)) not between 2 and 32 then raise exception 'Choose an alias between 2 and 32 characters'; end if;

  select * into v_challenge from public.challenges
  where id = p_challenge and active = true and now() between starts_at and ends_at
  for update;
  if not found then raise exception 'Challenge is not open'; end if;

  if v_challenge.max_members is not null then
    select count(*) into v_members from public.challenge_memberships where challenge_id = p_challenge;
    if v_members >= v_challenge.max_members
       and not exists (select 1 from public.challenge_memberships where challenge_id = p_challenge and client_id = v_uid)
    then raise exception 'This circle is full'; end if;
  end if;

  select count(*) into v_progress
  from public.bookings b
  where b.client_id = v_uid and b.status = 'completed'
    and coalesce(b.scheduled_at, b.created_at) between v_challenge.starts_at and v_challenge.ends_at;

  insert into public.challenge_memberships (challenge_id, client_id, display_alias, progress, completed_at)
  values (p_challenge, v_uid, btrim(p_alias), v_progress,
    case when v_progress >= v_challenge.target then now() else null end)
  on conflict (challenge_id, client_id) do update
    set display_alias = excluded.display_alias,
        progress = excluded.progress,
        completed_at = coalesce(public.challenge_memberships.completed_at, excluded.completed_at)
  returning * into v_result;
  return v_result;
end;
$$;
revoke all on function public.join_challenge(uuid, text) from public, anon;
grant execute on function public.join_challenge(uuid, text) to authenticated;

create or replace function public.get_challenge_leaderboard(p_challenge uuid)
returns table(rank_position bigint, display_alias text, progress integer, target integer, is_me boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select ranked.rank_position, ranked.display_alias, ranked.progress, c.target,
    ranked.client_id = (select auth.uid()) as is_me
  from (
    select m.client_id, m.display_alias, m.progress,
      row_number() over (order by m.progress desc, m.joined_at asc) as rank_position
    from public.challenge_memberships m
    where m.challenge_id = p_challenge
      and exists (
        select 1 from public.challenge_memberships mine
        where mine.challenge_id = p_challenge and mine.client_id = (select auth.uid())
      )
  ) ranked
  join public.challenges c on c.id = p_challenge
  order by ranked.rank_position
  limit 50;
$$;
revoke all on function public.get_challenge_leaderboard(uuid) from public, anon;
grant execute on function public.get_challenge_leaderboard(uuid) to authenticated;

create or replace function private.sync_verified_challenge_progress()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    update public.challenge_memberships m
    set progress = counted.total,
        completed_at = case when counted.total >= c.target then coalesce(m.completed_at, now()) else m.completed_at end
    from public.challenges c,
      lateral (
        select count(*)::integer as total
        from public.bookings b
        where b.client_id = new.client_id and b.status = 'completed'
          and coalesce(b.scheduled_at, b.created_at) between c.starts_at and c.ends_at
      ) counted
    where m.client_id = new.client_id and m.challenge_id = c.id
      and c.active = true and c.metric = 'verified_sessions';
  end if;
  return new;
end;
$$;
revoke all on function private.sync_verified_challenge_progress() from public, anon, authenticated;

create trigger bookings_sync_challenge_progress
after update of status on public.bookings
for each row execute function private.sync_verified_challenge_progress();

insert into public.challenges
  (slug, title, title_ar, description, description_ar, kind, target, reward_xp, starts_at, ends_at, max_members)
values
  ('three-session-week', 'Three-session week', 'ثلاث جلسات في أسبوع',
   'Build momentum with three verified FitConnect sessions before the week ends.',
   'ابنِ زخمك بإكمال ثلاث جلسات موثقة على FitConnect قبل نهاية الأسبوع.',
   'solo', 3, 150, date_trunc('week', now()), date_trunc('week', now()) + interval '7 days', null),
  ('riyadh-momentum-circle', 'Riyadh Momentum Circle', 'دائرة زخم الرياض',
   'A small, privacy-first circle chasing eight verified sessions together.',
   'دائرة صغيرة تراعي الخصوصية وتسعى لإكمال ثماني جلسات موثقة معاً.',
   'circle', 8, 400, date_trunc('week', now()), date_trunc('week', now()) + interval '28 days', 24),
  ('consistency-over-intensity', 'Consistency over intensity', 'الاستمرارية أهم من الشدة',
   'Six weeks, twelve sessions, and no public body metrics—only showing up counts.',
   'ستة أسابيع واثنتا عشرة جلسة، بلا قياسات جسدية عامة—الحضور هو ما يُحتسب.',
   'circle', 12, 650, date_trunc('week', now()), date_trunc('week', now()) + interval '42 days', 40)
on conflict (slug) do nothing;
