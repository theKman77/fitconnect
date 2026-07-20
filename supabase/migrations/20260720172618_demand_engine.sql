-- FitConnect Demand Engine
-- Private client waitlists, aggregate trainer demand, and expiring broadcasts
-- for otherwise-unused openings. A waitlist is intentionally not a trainer
-- lead list: trainers receive counts, never client identities.

create table public.waitlist_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  session_type_id uuid references public.session_types(id) on delete set null,
  format public.session_format not null default 'in_person',
  preferred_dayparts text[] not null default array['morning','afternoon','evening']::text[],
  preferred_weekdays smallint[] not null default array[0,1,2,3,4,5,6]::smallint[],
  city text,
  active boolean not null default true,
  expires_at timestamptz not null default (now() + interval '60 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waitlist_dayparts_check check (
    cardinality(preferred_dayparts) between 1 and 3
    and preferred_dayparts <@ array['morning','afternoon','evening']::text[]
  ),
  constraint waitlist_weekdays_check check (
    cardinality(preferred_weekdays) between 1 and 7
    and preferred_weekdays <@ array[0,1,2,3,4,5,6]::smallint[]
  ),
  constraint waitlist_expiry_check check (expires_at > created_at)
);

create unique index waitlist_one_active_relationship_idx
on public.waitlist_requests(client_id, trainer_id) where active = true;
create index waitlist_match_lookup_idx
on public.waitlist_requests(trainer_id, active, expires_at);
create index waitlist_client_created_idx
on public.waitlist_requests(client_id, created_at desc);

create trigger waitlist_requests_updated_at before update on public.waitlist_requests
for each row execute function public.set_updated_at();

create table public.slot_broadcasts (
  id uuid primary key default gen_random_uuid(),
  availability_id uuid not null unique references public.availability(id) on delete cascade,
  trainer_id uuid not null references public.trainers(id) on delete cascade,
  status text not null default 'open' check (status in ('open','claimed','closed','expired')),
  matched_count integer not null default 0 check (matched_count >= 0),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index slot_broadcasts_open_idx
on public.slot_broadcasts(status, expires_at) where status = 'open';
create index slot_broadcasts_trainer_created_idx
on public.slot_broadcasts(trainer_id, created_at desc);

create trigger slot_broadcasts_updated_at before update on public.slot_broadcasts
for each row execute function public.set_updated_at();

create table public.waitlist_matches (
  id uuid primary key default gen_random_uuid(),
  waitlist_id uuid not null references public.waitlist_requests(id) on delete cascade,
  broadcast_id uuid not null references public.slot_broadcasts(id) on delete cascade,
  client_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'new' check (status in ('new','seen','claimed','expired')),
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  unique(waitlist_id, broadcast_id)
);

create index waitlist_matches_client_created_idx
on public.waitlist_matches(client_id, created_at desc);
create index waitlist_matches_broadcast_idx
on public.waitlist_matches(broadcast_id, status);

alter table public.waitlist_requests enable row level security;
alter table public.slot_broadcasts enable row level security;
alter table public.waitlist_matches enable row level security;

create policy "clients read own waitlists" on public.waitlist_requests
for select to authenticated using ((select auth.uid()) = client_id);
create policy "clients delete own waitlists" on public.waitlist_requests
for delete to authenticated using ((select auth.uid()) = client_id);

create policy "active broadcasts are discoverable" on public.slot_broadcasts
for select to anon, authenticated
using (status = 'open' and expires_at > now());
create policy "trainers read own broadcasts" on public.slot_broadcasts
for select to authenticated using (
  exists (
    select 1 from public.trainers t
    where t.id = trainer_id and t.profile_id = (select auth.uid())
  )
);

create policy "clients read own waitlist matches" on public.waitlist_matches
for select to authenticated using ((select auth.uid()) = client_id);

-- The client-facing helper validates the relationship and prevents unlimited
-- active waitlists. It does not expose any other client's demand.
create or replace function public.join_trainer_waitlist(
  p_trainer uuid,
  p_session_type uuid default null,
  p_format public.session_format default 'in_person',
  p_dayparts text[] default array['morning','afternoon','evening']::text[],
  p_weekdays smallint[] default array[0,1,2,3,4,5,6]::smallint[],
  p_city text default 'Riyadh'
)
returns public.waitlist_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.waitlist_requests%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if cardinality(p_dayparts) not between 1 and 3
    or not (p_dayparts <@ array['morning','afternoon','evening']::text[])
  then raise exception 'Choose at least one valid time window'; end if;
  if cardinality(p_weekdays) not between 1 and 7
    or not (p_weekdays <@ array[0,1,2,3,4,5,6]::smallint[])
  then raise exception 'Choose at least one valid weekday'; end if;

  if not exists (
    select 1 from public.trainers t
    where t.id = p_trainer and t.onboarding_status = 'approved'
  ) then raise exception 'Trainer is not available'; end if;
  if p_session_type is not null and not exists (
    select 1 from public.session_types st
    where st.id = p_session_type and st.trainer_id = p_trainer and st.active = true
  ) then raise exception 'That session plan is not available'; end if;

  select * into v_row from public.waitlist_requests
  where client_id = v_uid and trainer_id = p_trainer and active = true
  for update;

  if found then
    update public.waitlist_requests set
      session_type_id = p_session_type,
      format = p_format,
      preferred_dayparts = p_dayparts,
      preferred_weekdays = p_weekdays,
      city = nullif(left(btrim(coalesce(p_city, '')), 120), ''),
      expires_at = now() + interval '60 days'
    where id = v_row.id returning * into v_row;
    return v_row;
  end if;

  if (select count(*) from public.waitlist_requests where client_id = v_uid and active = true) >= 12
  then raise exception 'You can follow up to 12 trainer waitlists'; end if;

  insert into public.waitlist_requests (
    client_id, trainer_id, session_type_id, format,
    preferred_dayparts, preferred_weekdays, city
  ) values (
    v_uid, p_trainer, p_session_type, p_format,
    p_dayparts, p_weekdays, nullif(left(btrim(coalesce(p_city, '')), 120), '')
  ) returning * into v_row;
  return v_row;
end;
$$;

-- Only the owning, approved trainer can promote a real unbooked opening.
-- The 72-hour limit preserves the last-minute inventory proposition.
create or replace function public.broadcast_opening(p_availability uuid)
returns public.slot_broadcasts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_slot public.availability%rowtype;
  v_broadcast public.slot_broadcasts%rowtype;
  v_daypart text;
  v_weekday smallint;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;

  select a.* into v_slot
  from public.availability a
  join public.trainers t on t.id = a.trainer_id
  where a.id = p_availability
    and t.profile_id = v_uid
    and t.onboarding_status = 'approved'
  for update of a;

  if not found then raise exception 'Opening not found or not owned by this trainer'; end if;
  if v_slot.booked then raise exception 'A booked opening cannot be broadcast'; end if;
  if v_slot.starts_at < now() + interval '15 minutes' then raise exception 'Opening is too close or has passed'; end if;
  if v_slot.starts_at > now() + interval '72 hours' then raise exception 'Pulse Drops are limited to the next 72 hours'; end if;
  if (select count(*) from public.slot_broadcasts where trainer_id = v_slot.trainer_id and status = 'open' and expires_at > now()) >= 8
  then raise exception 'Close an existing Pulse Drop before broadcasting another'; end if;

  insert into public.slot_broadcasts (availability_id, trainer_id, status, expires_at)
  values (v_slot.id, v_slot.trainer_id, 'open', v_slot.starts_at)
  on conflict (availability_id) do update set
    status = 'open', expires_at = excluded.expires_at, matched_count = 0
  returning * into v_broadcast;

  delete from public.waitlist_matches where broadcast_id = v_broadcast.id;

  v_weekday := extract(dow from v_slot.starts_at at time zone 'Asia/Riyadh')::smallint;
  v_daypart := case
    when extract(hour from v_slot.starts_at at time zone 'Asia/Riyadh') < 12 then 'morning'
    when extract(hour from v_slot.starts_at at time zone 'Asia/Riyadh') < 17 then 'afternoon'
    else 'evening'
  end;

  insert into public.waitlist_matches (waitlist_id, broadcast_id, client_id)
  select w.id, v_broadcast.id, w.client_id
  from public.waitlist_requests w
  where w.trainer_id = v_slot.trainer_id
    and w.active = true and w.expires_at > now()
    and v_weekday = any(w.preferred_weekdays)
    and v_daypart = any(w.preferred_dayparts)
  on conflict (waitlist_id, broadcast_id) do nothing;

  update public.slot_broadcasts
  set matched_count = (select count(*) from public.waitlist_matches where broadcast_id = v_broadcast.id)
  where id = v_broadcast.id
  returning * into v_broadcast;

  return v_broadcast;
end;
$$;

create or replace function public.close_slot_broadcast(p_broadcast uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  update public.slot_broadcasts sb set status = 'closed'
  where sb.id = p_broadcast and exists (
    select 1 from public.trainers t
    where t.id = sb.trainer_id and t.profile_id = v_uid
  );
  if not found then raise exception 'Broadcast not found or not owned by this trainer'; end if;
  update public.waitlist_matches set status = 'expired'
  where broadcast_id = p_broadcast and status in ('new','seen');
end;
$$;

create or replace function public.mark_waitlist_match_seen(p_match uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  update public.waitlist_matches set status = 'seen', seen_at = coalesce(seen_at, now())
  where id = p_match and client_id = v_uid and status = 'new';
end;
$$;

create or replace function public.get_trainer_demand_summary()
returns table(waitlisted_clients bigint, open_broadcasts bigint, matched_clients bigint)
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select t.id from public.trainers t where t.profile_id = (select auth.uid())
  )
  select
    (select count(*) from public.waitlist_requests w join mine m on m.id = w.trainer_id where w.active and w.expires_at > now()),
    (select count(*) from public.slot_broadcasts b join mine m on m.id = b.trainer_id where b.status = 'open' and b.expires_at > now()),
    (select count(*) from public.waitlist_matches wm join public.slot_broadcasts b on b.id = wm.broadcast_id join mine m on m.id = b.trainer_id where wm.status in ('new','seen'));
$$;

create or replace function private.resolve_demand_on_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_broadcast uuid;
begin
  select sb.id into v_broadcast
  from public.slot_broadcasts sb
  join public.availability a on a.id = sb.availability_id
  where a.trainer_id = new.trainer_id and a.starts_at = new.scheduled_at
    and sb.status = 'open';

  if v_broadcast is not null then
    update public.slot_broadcasts set status = 'claimed' where id = v_broadcast;
    update public.waitlist_matches
    set status = case when client_id = new.client_id then 'claimed' else 'expired' end
    where broadcast_id = v_broadcast and status in ('new','seen');
  end if;

  update public.waitlist_requests set active = false
  where client_id = new.client_id and trainer_id = new.trainer_id and active = true;
  return new;
end;
$$;

create trigger resolve_demand_on_booking after insert on public.bookings
for each row execute function private.resolve_demand_on_booking();

revoke all on table public.waitlist_requests, public.slot_broadcasts, public.waitlist_matches from anon, authenticated;
grant select, delete on table public.waitlist_requests to authenticated;
grant select on table public.slot_broadcasts to anon, authenticated;
grant select on table public.waitlist_matches to authenticated;

revoke all on function public.join_trainer_waitlist(uuid, uuid, public.session_format, text[], smallint[], text) from public, anon;
revoke all on function public.broadcast_opening(uuid) from public, anon;
revoke all on function public.close_slot_broadcast(uuid) from public, anon;
revoke all on function public.mark_waitlist_match_seen(uuid) from public, anon;
revoke all on function public.get_trainer_demand_summary() from public, anon;
grant execute on function public.join_trainer_waitlist(uuid, uuid, public.session_format, text[], smallint[], text) to authenticated;
grant execute on function public.broadcast_opening(uuid) to authenticated;
grant execute on function public.close_slot_broadcast(uuid) to authenticated;
grant execute on function public.mark_waitlist_match_seen(uuid) to authenticated;
grant execute on function public.get_trainer_demand_summary() to authenticated;

grant usage on schema public to anon, authenticated;
