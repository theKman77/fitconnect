-- FitConnect security foundation.
--
-- This migration makes the existing client-writable schema safe enough for a
-- controlled MVP: authoritative booking prices are calculated in a private
-- trigger, trust fields cannot be self-awarded, booking lifecycle changes are
-- role checked, and private profile data is no longer exposed for discovery.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Private RLS helpers (not exposed as Data API RPCs)
-- ---------------------------------------------------------------------------
create or replace function private.owns_trainer(t_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.trainers t
    where t.id = t_id and t.profile_id = (select auth.uid())
  );
$$;

create or replace function private.in_booking(b_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.bookings b
    join public.trainers t on t.id = b.trainer_id
    where b.id = b_id
      and (
        b.client_id = (select auth.uid())
        or t.profile_id = (select auth.uid())
        or exists (
          select 1 from public.booking_participants bp
          where bp.booking_id = b.id and bp.profile_id = (select auth.uid())
        )
      )
  );
$$;

revoke all on function private.owns_trainer(uuid) from public, anon;
revoke all on function private.in_booking(uuid) from public, anon;
grant execute on function private.owns_trainer(uuid) to authenticated, service_role;
grant execute on function private.in_booking(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Private marketplace configuration. Real checkout remains off until the
-- owner has a provider account; demo bookings are explicit simulations.
-- ---------------------------------------------------------------------------
create table if not exists private.marketplace_config (
  singleton boolean primary key default true check (singleton),
  payments_enabled boolean not null default false,
  service_fee_rate numeric(6,5) not null default 0.10 check (service_fee_rate between 0 and 1),
  evening_rate numeric(6,5) not null default 0.20 check (evening_rate between 0 and 1),
  equipment_fee numeric(10,2) not null default 45 check (equipment_fee >= 0),
  updated_at timestamptz not null default now()
);
insert into private.marketplace_config (singleton) values (true)
on conflict (singleton) do nothing;
revoke all on private.marketplace_config from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profiles: private by default. Discovery uses the trainers table, which
-- contains only the intended public trainer identity.
-- ---------------------------------------------------------------------------
drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles read trainers" on public.profiles;
drop policy if exists "profiles update own" on public.profiles;
drop policy if exists "profiles insert own" on public.profiles;
drop policy if exists "profiles read booking counterpart" on public.profiles;

create policy "profiles read own" on public.profiles for select
to authenticated
using (id = (select auth.uid()));

create policy "profiles update own" on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "profiles insert own" on public.profiles for insert
to authenticated
with check (id = (select auth.uid()));

create or replace function private.protect_profile_trust_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and coalesce(current_setting('fitconnect.trusted_write', true), '') <> '1'
     and (
       new.stripe_customer_id is distinct from old.stripe_customer_id
       or new.referral_code is distinct from old.referral_code
     ) then
    raise exception 'Protected profile fields cannot be changed by the client';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_trust_fields on public.profiles;
create trigger protect_profile_trust_fields
before update on public.profiles
for each row execute function private.protect_profile_trust_fields();

-- Return only the minimum counterpart identity for an actual booking.
create or replace function public.get_booking_counterpart(p_booking_id uuid)
returns table (profile_id uuid, full_name text, avatar_url text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_trainer_profile uuid;
begin
  if (select auth.uid()) is null or not private.in_booking(p_booking_id) then
    raise exception 'Not authorized for this booking';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id;
  select profile_id into v_trainer_profile
  from public.trainers where id = v_booking.trainer_id;

  if (select auth.uid()) = v_booking.client_id then
    return query
      select p.id, t.display_name, t.avatar_url
      from public.trainers t
      join public.profiles p on p.id = t.profile_id
      where t.id = v_booking.trainer_id;
  else
    return query
      select p.id, p.full_name, p.avatar_url
      from public.profiles p
      where p.id = v_booking.client_id;
  end if;
end;
$$;
revoke all on function public.get_booking_counterpart(uuid) from public, anon;
grant execute on function public.get_booking_counterpart(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Trainers: owners edit portfolio fields, while trust fields remain platform
-- controlled. New trainer profiles stay draft until explicitly approved.
-- ---------------------------------------------------------------------------
alter table public.trainers
  add column if not exists onboarding_status text not null default 'draft';

update public.trainers set onboarding_status = 'approved' where verified = true;

do $$ begin
  alter table public.trainers add constraint trainers_onboarding_status_check
    check (onboarding_status in ('draft', 'submitted', 'approved', 'rejected', 'suspended'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.trainers add constraint trainers_rating_check
    check (rating between 0 and 5 and review_count >= 0 and years_experience >= 0);
exception when duplicate_object then null; end $$;

create or replace function private.protect_trainer_trust_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
     and coalesce(current_setting('fitconnect.trusted_write', true), '') <> '1'
     and (
       new.profile_id is distinct from old.profile_id
       or new.verified is distinct from old.verified
       or new.rating is distinct from old.rating
       or new.review_count is distinct from old.review_count
       or new.onboarding_status is distinct from old.onboarding_status
     ) then
    raise exception 'Trainer trust fields are platform controlled';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_trainer_trust_fields on public.trainers;
create trigger protect_trainer_trust_fields
before update on public.trainers
for each row execute function private.protect_trainer_trust_fields();

drop policy if exists "trainers read all" on public.trainers;
drop policy if exists "trainers manage own" on public.trainers;

create policy "trainers read approved or own" on public.trainers for select
to anon, authenticated
using (onboarding_status = 'approved' or profile_id = (select auth.uid()));

create policy "trainers insert own draft" on public.trainers for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and verified = false
  and rating = 0
  and review_count = 0
  and onboarding_status = 'draft'
);

create policy "trainers update own portfolio" on public.trainers for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

-- Session plans and availability remain owner-editable, with basic integrity.
do $$ begin
  alter table public.session_types add constraint session_types_price_check
    check (price >= 1 and duration_min between 15 and 240 and coalesce(sessions_included, 1) > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.availability add constraint availability_range_check
    check (ends_at > starts_at);
exception when duplicate_object then null; end $$;

drop policy if exists "session_types read" on public.session_types;
drop policy if exists "session_types manage" on public.session_types;
create policy "session_types read" on public.session_types for select
to anon, authenticated using (true);
create policy "session_types insert own" on public.session_types for insert
to authenticated with check (private.owns_trainer(trainer_id));
create policy "session_types update own" on public.session_types for update
to authenticated using (private.owns_trainer(trainer_id))
with check (private.owns_trainer(trainer_id));
create policy "session_types delete own" on public.session_types for delete
to authenticated using (private.owns_trainer(trainer_id));

drop policy if exists "availability read" on public.availability;
drop policy if exists "availability manage" on public.availability;
create policy "availability read" on public.availability for select
to anon, authenticated using (true);
create policy "availability insert own" on public.availability for insert
to authenticated with check (private.owns_trainer(trainer_id));
create policy "availability update own" on public.availability for update
to authenticated using (private.owns_trainer(trainer_id))
with check (private.owns_trainer(trainer_id));
create policy "availability delete own" on public.availability for delete
to authenticated using (private.owns_trainer(trainer_id));

-- ---------------------------------------------------------------------------
-- Booking integrity and lifecycle
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists payment_status text not null default 'unpaid',
  add column if not exists payment_provider text,
  add column if not exists quoted_at timestamptz not null default now();

update public.bookings
set payment_status = case when paid then 'simulation' else 'unpaid' end,
    payment_provider = case when paid then 'demo' else payment_provider end,
    paid = false
where payment_status = 'unpaid';

do $$ begin
  alter table public.bookings add constraint bookings_payment_status_check
    check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded', 'simulation'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.bookings add constraint bookings_money_check
    check (
      base_price >= 0 and equipment_fee >= 0 and peak_surge >= 0
      and service_fee >= 0 and total >= 0 and amount_due >= 0
      and duration_min between 15 and 240
    );
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.bookings add constraint bookings_coordinates_check
    check (
      (lat is null or lat between -90 and 90)
      and (lng is null or lng between -180 and 180)
    );
exception when duplicate_object then null; end $$;

create unique index if not exists bookings_one_trainer_per_start
on public.bookings (trainer_id, scheduled_at)
where scheduled_at is not null and status not in ('cancelled', 'no_show');

create or replace function private.price_and_validate_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.session_types%rowtype;
  v_config private.marketplace_config%rowtype;
  v_local_hour int;
  v_subtotal numeric(10,2);
begin
  if tg_op <> 'INSERT' then
    if (select auth.uid()) is not null
       and coalesce(current_setting('fitconnect.trusted_write', true), '') <> '1' then
      raise exception 'Bookings can only be changed through a protected lifecycle action';
    end if;
    return new;
  end if;

  if (select auth.uid()) is not null and new.client_id <> (select auth.uid()) then
    raise exception 'A booking can only be created for the signed-in client';
  end if;

  if new.session_type_id is null then
    raise exception 'A session plan is required';
  end if;

  select st.* into v_plan
  from public.session_types st
  join public.trainers t on t.id = st.trainer_id
  where st.id = new.session_type_id
    and st.trainer_id = new.trainer_id
    and st.active = true
    and t.onboarding_status = 'approved';
  if not found then
    raise exception 'The selected plan is not available for this trainer';
  end if;

  if new.scheduled_at is null or new.scheduled_at < now() + interval '15 minutes' then
    raise exception 'Choose a future session time';
  end if;

  if new.format = 'in_person' and nullif(btrim(new.address_line), '') is null then
    raise exception 'An address is required for in-person sessions';
  end if;

  if new.is_split then
    raise exception 'Split payment is not available yet';
  end if;

  if exists (
    select 1 from public.bookings b
    where b.trainer_id = new.trainer_id
      and b.scheduled_at = new.scheduled_at
      and b.status not in ('cancelled', 'no_show')
  ) then
    raise exception 'That trainer is already booked at this time';
  end if;

  select * into v_config from private.marketplace_config where singleton = true;
  v_local_hour := extract(hour from new.scheduled_at at time zone 'Asia/Riyadh');

  new.duration_min := coalesce(v_plan.duration_min, 60);
  new.base_price := round(v_plan.price, 2);
  new.equipment_fee := case when new.equipment_by_trainer then v_config.equipment_fee else 0 end;
  new.peak_surge := case when v_local_hour >= 18 and v_local_hour < 20
    then round(new.base_price * v_config.evening_rate, 2) else 0 end;
  v_subtotal := new.base_price + new.equipment_fee + new.peak_surge;
  new.service_fee := round(v_subtotal * v_config.service_fee_rate, 2);
  new.total := v_subtotal + new.service_fee;
  new.amount_due := new.total;
  new.friend_email := null;
  new.is_split := false;
  new.paid := false;
  new.stripe_checkout_id := null;
  new.stripe_payment_intent := null;
  new.quoted_at := now();

  if v_config.payments_enabled then
    new.status := 'pending';
    new.payment_status := 'pending';
    new.payment_provider := null;
  else
    new.status := 'confirmed';
    new.payment_status := 'simulation';
    new.payment_provider := 'demo';
  end if;

  return new;
end;
$$;

drop trigger if exists price_and_validate_booking on public.bookings;
create trigger price_and_validate_booking
before insert or update on public.bookings
for each row execute function private.price_and_validate_booking();

drop policy if exists "bookings read" on public.bookings;
drop policy if exists "bookings insert" on public.bookings;
drop policy if exists "bookings update" on public.bookings;
create policy "bookings read participants" on public.bookings for select
to authenticated using (client_id = (select auth.uid()) or private.in_booking(id));
create policy "bookings insert own" on public.bookings for insert
to authenticated with check (client_id = (select auth.uid()));

create or replace function public.advance_booking_status(p_booking_id uuid, p_next public.booking_status)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_owner uuid;
begin
  if (select auth.uid()) is null then raise exception 'Authentication required'; end if;

  select b.* into v_booking
  from public.bookings b
  where b.id = p_booking_id
  for update;

  select t.profile_id into v_owner
  from public.trainers t
  where t.id = v_booking.trainer_id;

  if not found or v_owner <> (select auth.uid()) then
    raise exception 'Only the assigned trainer can update this session';
  end if;

  if not (
    (v_booking.status = 'confirmed' and p_next = 'en_route')
    or (v_booking.status = 'en_route' and p_next = 'arriving')
    or (v_booking.status = 'arriving' and p_next = 'in_progress')
    or (v_booking.status = 'in_progress' and p_next = 'completed')
  ) then
    raise exception 'Invalid booking status transition';
  end if;

  perform set_config('fitconnect.trusted_write', '1', true);
  update public.bookings set status = p_next where id = p_booking_id returning * into v_booking;
  return v_booking;
end;
$$;
revoke all on function public.advance_booking_status(uuid, public.booking_status) from public, anon;
grant execute on function public.advance_booking_status(uuid, public.booking_status) to authenticated;

create or replace function public.cancel_my_booking(p_booking_id uuid)
returns public.bookings
language plpgsql
security definer
set search_path = ''
as $$
declare v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings
  where id = p_booking_id and client_id = (select auth.uid()) for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'This booking can no longer be cancelled in the app';
  end if;
  perform set_config('fitconnect.trusted_write', '1', true);
  update public.bookings set status = 'cancelled' where id = p_booking_id returning * into v_booking;
  return v_booking;
end;
$$;
revoke all on function public.cancel_my_booking(uuid) from public, anon;
grant execute on function public.cancel_my_booking(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Other participant data
-- ---------------------------------------------------------------------------
drop policy if exists "participants read" on public.booking_participants;
drop policy if exists "participants write" on public.booking_participants;
create policy "participants read booking" on public.booking_participants for select
to authenticated using (private.in_booking(booking_id));

drop policy if exists "messages read" on public.messages;
drop policy if exists "messages insert" on public.messages;
create policy "messages read booking" on public.messages for select
to authenticated using (private.in_booking(booking_id));
create policy "messages insert booking" on public.messages for insert
to authenticated with check (
  sender_id = (select auth.uid())
  and private.in_booking(booking_id)
  and char_length(btrim(body)) between 1 and 2000
);

drop policy if exists "locations read" on public.trainer_locations;
drop policy if exists "locations write" on public.trainer_locations;
create policy "locations read booking" on public.trainer_locations for select
to authenticated using (private.in_booking(booking_id));
create policy "locations trainer insert" on public.trainer_locations for insert
to authenticated with check (
  exists (
    select 1 from public.bookings b
    where b.id = booking_id and private.owns_trainer(b.trainer_id)
      and b.status in ('confirmed', 'en_route', 'arriving', 'in_progress')
  )
  and lat between -90 and 90 and lng between -180 and 180
);
create policy "locations trainer update" on public.trainer_locations for update
to authenticated using (
  exists (
    select 1 from public.bookings b
    where b.id = booking_id and private.owns_trainer(b.trainer_id)
  )
)
with check (
  exists (
    select 1 from public.bookings b
    where b.id = booking_id and private.owns_trainer(b.trainer_id)
      and b.status in ('confirmed', 'en_route', 'arriving', 'in_progress')
  )
  and lat between -90 and 90 and lng between -180 and 180
);

drop policy if exists "reviews read" on public.reviews;
drop policy if exists "reviews insert" on public.reviews;
create policy "reviews public read" on public.reviews for select
to anon, authenticated using (true);
create policy "reviews completed booking insert" on public.reviews for insert
to authenticated with check (
  rater_id = (select auth.uid())
  and exists (
    select 1
    from public.bookings b
    join public.trainers t on t.id = b.trainer_id
    where b.id = booking_id
      and b.status = 'completed'
      and (
        (direction = 'client_to_trainer' and b.client_id = (select auth.uid()) and ratee_id = t.profile_id)
        or
        (direction = 'trainer_to_client' and t.profile_id = (select auth.uid()) and ratee_id = b.client_id)
      )
  )
);

create or replace function private.refresh_trainer_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_profile uuid := coalesce(new.ratee_id, old.ratee_id);
begin
  perform set_config('fitconnect.trusted_write', '1', true);
  update public.trainers t
  set rating = coalesce((
        select round(avg(r.rating)::numeric, 1) from public.reviews r
        where r.ratee_id = v_profile and r.direction = 'client_to_trainer'
      ), 0),
      review_count = (
        select count(*)::int from public.reviews r
        where r.ratee_id = v_profile and r.direction = 'client_to_trainer'
      )
  where t.profile_id = v_profile;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists refresh_trainer_rating on public.reviews;
create trigger refresh_trainer_rating
after insert or update or delete on public.reviews
for each row execute function private.refresh_trainer_rating();

drop policy if exists "subs read own" on public.subscriptions;
drop policy if exists "subs write own" on public.subscriptions;
create policy "subscriptions read own" on public.subscriptions for select
to authenticated using (client_id = (select auth.uid()));

-- Optimize and scope remaining ownership policies.
drop policy if exists "favorites own" on public.favorites;
create policy "favorites own" on public.favorites for all
to authenticated using (client_id = (select auth.uid()))
with check (client_id = (select auth.uid()));

drop policy if exists "progress own" on public.progress_entries;
create policy "progress own" on public.progress_entries for all
to authenticated using (client_id = (select auth.uid()))
with check (client_id = (select auth.uid()));

drop policy if exists "workouts own" on public.workouts;
create policy "workouts own" on public.workouts for all
to authenticated using (client_id = (select auth.uid()))
with check (client_id = (select auth.uid()));

drop policy if exists "prs own" on public.personal_records;
create policy "prs own" on public.personal_records for all
to authenticated using (client_id = (select auth.uid()))
with check (client_id = (select auth.uid()));

-- Performance indexes flagged by the live Supabase advisor.
create index if not exists idx_participants_profile on public.booking_participants(profile_id);
create index if not exists idx_bookings_session_type on public.bookings(session_type_id);
create index if not exists idx_favorites_trainer on public.favorites(trainer_id);
create index if not exists idx_messages_sender on public.messages(sender_id);
create index if not exists idx_reviews_rater on public.reviews(rater_id);
create index if not exists idx_subscriptions_trainer on public.subscriptions(trainer_id);
create index if not exists idx_subscriptions_session_type on public.subscriptions(session_type_id);
create index if not exists idx_workouts_booking on public.workouts(booking_id);

-- Public helper functions from earlier migrations are no longer needed by RLS.
revoke all on function public.owns_trainer(uuid) from public, anon, authenticated;
revoke all on function public.in_booking(uuid) from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
