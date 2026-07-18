-- FitConnect trainer value engine
-- Makes the fee ladder real, exposes an honest payout per booking, and makes
-- trainer onboarding atomic so partially-created accounts cannot occur.

alter table public.bookings
  add column if not exists trainer_fee_rate numeric(5,4) not null default 0.10,
  add column if not exists trainer_platform_fee numeric(10,2) not null default 0,
  add column if not exists trainer_payout numeric(10,2) not null default 0;

do $$ begin
  alter table public.bookings add constraint bookings_trainer_payout_check
    check (
      trainer_fee_rate between 0 and 1
      and trainer_platform_fee >= 0
      and trainer_payout >= 0
      and trainer_platform_fee + trainer_payout <= base_price + equipment_fee + peak_surge + 0.01
    );
exception when duplicate_object then null; end $$;

create or replace function private.trainer_commission_rate(p_trainer uuid, p_client uuid)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_all integer;
  v_repeat integer;
  v_rate numeric;
begin
  select count(*) into v_all from public.bookings
  where trainer_id = p_trainer and status = 'completed';

  select count(*) into v_repeat from public.bookings
  where trainer_id = p_trainer and client_id = p_client and status = 'completed';

  v_rate := case
    when v_all >= 75 then 0.06
    when v_all >= 30 then 0.08
    when v_all >= 10 then 0.09
    else 0.10
  end;

  v_rate := case
    when v_repeat >= 20 then greatest(0.03, v_rate - 0.05)
    when v_repeat >= 10 then greatest(0.04, v_rate - 0.04)
    when v_repeat >= 5 then greatest(0.05, v_rate - 0.02)
    else v_rate
  end;
  return v_rate;
end;
$$;
revoke all on function private.trainer_commission_rate(uuid, uuid) from public, anon, authenticated;

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
  if new.session_type_id is null then raise exception 'A session plan is required'; end if;

  select st.* into v_plan
  from public.session_types st
  join public.trainers t on t.id = st.trainer_id
  where st.id = new.session_type_id and st.trainer_id = new.trainer_id
    and st.active = true and t.onboarding_status = 'approved';
  if not found then raise exception 'The selected plan is not available for this trainer'; end if;

  if new.scheduled_at is null or new.scheduled_at < now() + interval '15 minutes' then
    raise exception 'Choose a future session time';
  end if;
  if new.format = 'in_person' and nullif(btrim(new.address_line), '') is null then
    raise exception 'An address is required for in-person sessions';
  end if;
  if new.is_split then raise exception 'Split payment is not available yet'; end if;
  if exists (
    select 1 from public.bookings b where b.trainer_id = new.trainer_id
      and b.scheduled_at = new.scheduled_at and b.status not in ('cancelled', 'no_show')
  ) then raise exception 'That trainer is already booked at this time'; end if;

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
  new.trainer_fee_rate := private.trainer_commission_rate(new.trainer_id, new.client_id);
  new.trainer_platform_fee := round(v_subtotal * new.trainer_fee_rate, 2);
  new.trainer_payout := v_subtotal - new.trainer_platform_fee;
  new.friend_email := null;
  new.is_split := false;
  new.paid := false;
  new.stripe_checkout_id := null;
  new.stripe_payment_intent := null;
  new.quoted_at := now();

  if v_config.payments_enabled then
    new.status := 'pending'; new.payment_status := 'pending'; new.payment_provider := null;
  else
    new.status := 'confirmed'; new.payment_status := 'simulation'; new.payment_provider := 'demo';
  end if;
  return new;
end;
$$;

update public.bookings b
set trainer_fee_rate = private.trainer_commission_rate(b.trainer_id, b.client_id),
    trainer_platform_fee = round((b.base_price + b.equipment_fee + b.peak_surge)
      * private.trainer_commission_rate(b.trainer_id, b.client_id), 2),
    trainer_payout = (b.base_price + b.equipment_fee + b.peak_surge)
      - round((b.base_price + b.equipment_fee + b.peak_surge)
      * private.trainer_commission_rate(b.trainer_id, b.client_id), 2);

create or replace function public.become_trainer()
returns public.trainers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_profile public.profiles%rowtype;
  v_trainer public.trainers%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_profile from public.profiles where id = v_uid for update;
  if not found then raise exception 'Complete your client profile first'; end if;

  select * into v_trainer from public.trainers where profile_id = v_uid;
  if found then return v_trainer; end if;

  insert into public.trainers (
    profile_id, display_name, avatar_url, headline, city, base_price,
    languages, specialties, socials, onboarding_status, verified
  ) values (
    v_uid, coalesce(nullif(btrim(v_profile.full_name), ''), 'New trainer'),
    v_profile.avatar_url, 'Personal trainer', coalesce(v_profile.city, 'Riyadh'),
    200, array['English','Arabic'], array['Strength','Conditioning'],
    coalesce(v_profile.socials, '{}'::jsonb), 'draft', false
  ) returning * into v_trainer;

  insert into public.session_types
    (trainer_id, name, description, kind, price, billing_period, sessions_included, sort, active)
  values
    (v_trainer.id, 'Single session', 'One-off, in person or virtual', 'single', 200, 'session', 1, 0, true),
    (v_trainer.id, 'Pro plan', '8 sessions per month plus chat support', 'subscription', 1080, 'mo', 8, 1, false);

  update public.profiles set role = 'trainer' where id = v_uid;
  return v_trainer;
end;
$$;
revoke all on function public.become_trainer() from public, anon;
grant execute on function public.become_trainer() to authenticated;

create index if not exists availability_trainer_starts_idx
on public.availability (trainer_id, starts_at) where booked = false;
