-- Security hardening (addresses Supabase advisor warnings).
-- Applied to the live DB on 2026-07-17 via the Supabase connector.
--   1. Pin search_path on all functions (prevents search_path hijacking).
--   2. Revoke direct RPC execute on internal trigger/RLS-helper functions from anon.
--
-- Note: owns_trainer / in_booking remain callable by `authenticated` because the
-- RLS policies invoke them. Fully removing that RPC surface means moving them to a
-- non-exposed schema and rewriting the policies — deferred to a pre-launch pass.

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  )
  on conflict (id) do nothing;
  return new;
end $$;

create or replace function public.owns_trainer(t_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.trainers t where t.id = t_id and t.profile_id = auth.uid()
  );
$$;

create or replace function public.in_booking(b_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.bookings b
    join public.trainers t on t.id = b.trainer_id
    where b.id = b_id and (b.client_id = auth.uid() or t.profile_id = auth.uid())
  );
$$;

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.owns_trainer(uuid) from anon;
revoke execute on function public.in_booking(uuid) from anon;
