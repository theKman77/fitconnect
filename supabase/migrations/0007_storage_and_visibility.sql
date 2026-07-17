-- Storage buckets (avatars, trainer videos, progress photos) + policies,
-- trainer visibility into their clients' names, and demo-data honesty fixes.
-- PASTE THIS INTO THE SUPABASE SQL EDITOR AND RUN IT ONCE.

-- ---------------------------------------------------------------------------
-- Buckets (public read; users write only inside their own folder)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('videos', 'videos', true),
  ('progress', 'progress', true)
on conflict (id) do nothing;

create policy "storage read public" on storage.objects for select
  using (bucket_id in ('avatars', 'videos', 'progress'));

create policy "storage write own folder" on storage.objects for insert
  with check (
    bucket_id in ('avatars', 'videos', 'progress')
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage update own folder" on storage.objects for update
  using (
    bucket_id in ('avatars', 'videos', 'progress')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage delete own folder" on storage.objects for delete
  using (
    bucket_id in ('avatars', 'videos', 'progress')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Trainers can see the profiles (name/avatar) of clients who booked them
-- ---------------------------------------------------------------------------
create policy "profiles read booking counterpart" on public.profiles for select
  using (
    exists (
      select 1 from public.bookings b
      join public.trainers t on t.id = b.trainer_id
      where b.client_id = profiles.id and t.profile_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Honesty: remove the fake demo video URL (real uploads replace it)
-- ---------------------------------------------------------------------------
update public.trainers set video_intro_url = null
  where video_intro_url like '%example.com%';
