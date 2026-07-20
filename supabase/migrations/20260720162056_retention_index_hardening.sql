-- Cover relationship foreign keys used by RLS checks and dashboard queries.
create index challenge_memberships_client_idx
on public.challenge_memberships (client_id);

create index coach_nudges_trainer_created_idx
on public.coach_nudges (trainer_id, created_at desc);

create index trainer_client_records_client_idx
on public.trainer_client_records (client_id);
