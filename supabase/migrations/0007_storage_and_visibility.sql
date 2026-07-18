-- Storage foundation. Public portfolio media is separated from private
-- progress media; every write is namespaced to the authenticated user's id.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('videos', 'videos', true, 52428800, array['video/mp4', 'video/quicktime', 'video/webm']),
  ('progress', 'progress', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "storage read public" on storage.objects;
drop policy if exists "storage write own folder" on storage.objects;
drop policy if exists "storage update own folder" on storage.objects;
drop policy if exists "storage delete own folder" on storage.objects;
drop policy if exists "storage read portfolio" on storage.objects;
drop policy if exists "storage read own progress" on storage.objects;
drop policy if exists "storage insert own folder" on storage.objects;

create policy "storage read portfolio" on storage.objects for select
to anon, authenticated
using (bucket_id in ('avatars', 'videos'));

create policy "storage read own progress" on storage.objects for select
to authenticated
using (
  bucket_id = 'progress'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "storage insert own folder" on storage.objects for insert
to authenticated
with check (
  bucket_id in ('avatars', 'videos', 'progress')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "storage update own folder" on storage.objects for update
to authenticated
using (
  bucket_id in ('avatars', 'videos', 'progress')
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id in ('avatars', 'videos', 'progress')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

create policy "storage delete own folder" on storage.objects for delete
to authenticated
using (
  bucket_id in ('avatars', 'videos', 'progress')
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Do not expose entire client profile rows to trainers. A later protected RPC
-- returns only the booking counterpart's name and avatar when required.
drop policy if exists "profiles read booking counterpart" on public.profiles;

-- Remove historical placeholder media. Real trainer uploads replace it.
update public.trainers set video_intro_url = null
where video_intro_url like '%example.com%';
