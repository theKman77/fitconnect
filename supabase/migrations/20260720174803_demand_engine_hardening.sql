-- Follow-up hardening from the production database advisors.
-- Keep public inventory readable while evaluating one SELECT policy per role.
drop policy if exists "active broadcasts are discoverable" on public.slot_broadcasts;
drop policy if exists "trainers read own broadcasts" on public.slot_broadcasts;

create policy "broadcast inventory is appropriately visible" on public.slot_broadcasts
for select to anon, authenticated
using (
  (status = 'open' and expires_at > now())
  or exists (
    select 1 from public.trainers t
    where t.id = trainer_id and t.profile_id = (select auth.uid())
  )
);

create index if not exists waitlist_requests_session_type_idx
on public.waitlist_requests(session_type_id)
where session_type_id is not null;

-- A trainer account must not use the client-side waitlist RPC. The row-level
-- policies already hide other clients; this guard also preserves role intent.
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
  if not exists (select 1 from public.profiles p where p.id = v_uid and p.role = 'client')
  then raise exception 'A client account is required'; end if;
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

revoke all on function public.join_trainer_waitlist(uuid, uuid, public.session_format, text[], smallint[], text) from public, anon;
grant execute on function public.join_trainer_waitlist(uuid, uuid, public.session_format, text[], smallint[], text) to authenticated;
