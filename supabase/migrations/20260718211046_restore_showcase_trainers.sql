-- Keep the fixed showcase records from 0002 visible for demos. They remain
-- unverified, so the UI does not present them as identity-checked trainers.
update public.trainers
set onboarding_status = 'approved'
where id in (
  '22222222-2222-4222-8222-222222222205'::uuid,
  '22222222-2222-4222-8222-222222222206'::uuid
)
and verified = false;
