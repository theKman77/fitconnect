-- Trainer application submission. Approval remains an operator decision; the
-- trainer cannot self-verify or move themselves into the approved state.

create or replace function public.submit_trainer_application()
returns public.trainers
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_trainer public.trainers%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_trainer from public.trainers where profile_id = v_uid for update;
  if not found then raise exception 'Create a trainer profile first'; end if;
  if v_trainer.onboarding_status = 'approved' then return v_trainer; end if;
  if v_trainer.onboarding_status = 'suspended' then raise exception 'This account is suspended'; end if;
  if nullif(btrim(v_trainer.headline), '') is null
     or nullif(btrim(v_trainer.bio), '') is null
     or coalesce(array_length(v_trainer.specialties, 1), 0) = 0
     or v_trainer.base_price < 1 then
    raise exception 'Add a headline, bio, specialty, and valid price before submitting';
  end if;

  perform set_config('fitconnect.trusted_write', '1', true);
  update public.trainers set onboarding_status = 'submitted' where id = v_trainer.id
  returning * into v_trainer;
  return v_trainer;
end;
$$;
revoke all on function public.submit_trainer_application() from public, anon;
grant execute on function public.submit_trainer_application() to authenticated;

create unique index if not exists availability_one_start_per_trainer
on public.availability (trainer_id, starts_at);
