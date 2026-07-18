-- If a trainer publishes availability, bookings must use an open published
-- slot. Seed/demo trainers without slots retain the flexible MVP date picker.

create or replace function private.enforce_published_availability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.availability a
    where a.trainer_id = new.trainer_id and a.starts_at >= now()
  ) and not exists (
    select 1 from public.availability a
    where a.trainer_id = new.trainer_id
      and a.starts_at = new.scheduled_at
      and a.booked = false
  ) then
    raise exception 'Choose one of the trainer''s published openings';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_published_availability on public.bookings;
create trigger enforce_published_availability
before insert on public.bookings
for each row execute function private.enforce_published_availability();

create or replace function private.sync_availability_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.availability set booked = true
    where trainer_id = new.trainer_id and starts_at = new.scheduled_at and booked = false;
  elsif new.status in ('cancelled', 'no_show') and old.status is distinct from new.status then
    update public.availability set booked = false
    where trainer_id = new.trainer_id and starts_at = new.scheduled_at;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_availability_booking on public.bookings;
create trigger sync_availability_booking
after insert or update on public.bookings
for each row execute function private.sync_availability_booking();
