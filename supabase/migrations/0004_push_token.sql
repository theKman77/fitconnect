-- Store each user's Expo push token so we can send them notifications.
-- Applied to the live DB on 2026-07-17 via the Supabase connector.
alter table public.profiles add column if not exists push_token text;
