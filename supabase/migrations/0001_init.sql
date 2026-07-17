-- FitConnect — initial schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Covers: profiles, trainers, session types, availability, bookings + split
-- participants, realtime chat, live location, reviews, subscriptions,
-- favorites, progress, referrals. Row-Level Security is enabled on everything.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('client', 'trainer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_format as enum ('in_person', 'virtual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_kind as enum ('single', 'pack', 'subscription');
exception when duplicate_object then null; end $$;

do $$ begin
  create type booking_status as enum
    ('pending', 'confirmed', 'en_route', 'arriving', 'in_progress',
     'completed', 'cancelled', 'no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type review_direction as enum ('client_to_trainer', 'trainer_to_client');
exception when duplicate_object then null; end $$;

do $$ begin
  create type subscription_status as enum ('active', 'paused', 'cancelled', 'past_due');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- updated_at helper
-- ---------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

-- ---------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'client',
  full_name text,
  avatar_url text,
  city text,
  phone text,
  -- onboarding quiz
  goals text[] default '{}',
  experience_level text,
  injuries text[] default '{}',
  onboarded boolean not null default false,
  -- safety & accessibility
  emergency_contact_name text,
  emergency_contact_phone text,
  high_contrast boolean not null default false,
  large_text boolean not null default false,
  -- billing / referral
  stripe_customer_id text,
  referral_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_profiles_updated before update on profiles
  for each row execute function set_updated_at();

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, referral_code)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  )
  on conflict (id) do nothing;
  return new;
end $$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- trainers
-- ---------------------------------------------------------------------------
create table if not exists trainers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references profiles(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  headline text,
  bio text,
  specialties text[] default '{}',
  years_experience int default 0,
  gender text,
  languages text[] default '{}',
  verified boolean not null default false,
  rating numeric(2,1) default 0,
  review_count int default 0,
  city text,
  lat double precision,
  lng double precision,
  available_now boolean not null default false,
  video_intro_url text,
  photos text[] default '{}',
  base_price numeric(10,2) default 0,   -- "from" price shown on cards
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_trainers_updated before update on trainers
  for each row execute function set_updated_at();
create index if not exists idx_trainers_available on trainers(available_now);
create index if not exists idx_trainers_rating on trainers(rating desc);

-- ---------------------------------------------------------------------------
-- session_types (offerings per trainer)
-- ---------------------------------------------------------------------------
create table if not exists session_types (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references trainers(id) on delete cascade,
  name text not null,
  description text,
  kind session_kind not null default 'single',
  price numeric(10,2) not null,
  billing_period text,           -- e.g. 'session' | 'mo'
  sessions_included int,         -- for packs/subscriptions
  duration_min int default 60,
  popular boolean not null default false,
  active boolean not null default true,
  sort int default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_session_types_trainer on session_types(trainer_id);

-- ---------------------------------------------------------------------------
-- availability slots
-- ---------------------------------------------------------------------------
create table if not exists availability (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references trainers(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_peak boolean not null default false,
  booked boolean not null default false
);
create index if not exists idx_availability_trainer on availability(trainer_id, starts_at);

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  trainer_id uuid not null references trainers(id) on delete restrict,
  session_type_id uuid references session_types(id) on delete set null,
  status booking_status not null default 'pending',
  format session_format not null default 'in_person',
  scheduled_at timestamptz,
  duration_min int default 60,
  -- location
  address_line text,
  city text,
  lat double precision,
  lng double precision,
  virtual_link text,
  -- options
  is_split boolean not null default false,
  friend_email text,
  equipment_by_trainer boolean not null default false,
  equipment_items text[] default '{}',
  -- pricing breakdown (all in app currency)
  base_price numeric(10,2) not null default 0,
  equipment_fee numeric(10,2) not null default 0,
  peak_surge numeric(10,2) not null default 0,
  service_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  amount_due numeric(10,2) not null default 0,  -- client's share (half if split)
  -- payments
  stripe_checkout_id text,
  stripe_payment_intent text,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_bookings_updated before update on bookings
  for each row execute function set_updated_at();
create index if not exists idx_bookings_client on bookings(client_id, created_at desc);
create index if not exists idx_bookings_trainer on bookings(trainer_id, created_at desc);

-- Extra participants for split ("train with a friend") bookings.
create table if not exists booking_participants (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  email text,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_participants_booking on booking_participants(booking_id);

-- ---------------------------------------------------------------------------
-- messages (in-app chat, realtime)
-- ---------------------------------------------------------------------------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_booking on messages(booking_id, created_at);

-- ---------------------------------------------------------------------------
-- live trainer location per active booking (realtime tracking)
-- ---------------------------------------------------------------------------
create table if not exists trainer_locations (
  booking_id uuid primary key references bookings(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  heading double precision,
  eta_minutes int,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- reviews (two-way)
-- ---------------------------------------------------------------------------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  rater_id uuid not null references profiles(id) on delete cascade,
  ratee_id uuid not null references profiles(id) on delete cascade,
  direction review_direction not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  tags text[] default '{}',
  photo_url text,
  created_at timestamptz not null default now(),
  unique (booking_id, direction)
);
create index if not exists idx_reviews_ratee on reviews(ratee_id, created_at desc);

-- ---------------------------------------------------------------------------
-- subscriptions / memberships
-- ---------------------------------------------------------------------------
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  trainer_id uuid not null references trainers(id) on delete restrict,
  session_type_id uuid references session_types(id) on delete set null,
  status subscription_status not null default 'active',
  plan_name text,
  price numeric(10,2),
  sessions_included int default 0,
  sessions_used int default 0,
  loyalty_weeks int default 0,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_subs_updated before update on subscriptions
  for each row execute function set_updated_at();
create index if not exists idx_subs_client on subscriptions(client_id);

-- ---------------------------------------------------------------------------
-- favorites
-- ---------------------------------------------------------------------------
create table if not exists favorites (
  client_id uuid not null references profiles(id) on delete cascade,
  trainer_id uuid not null references trainers(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (client_id, trainer_id)
);

-- ---------------------------------------------------------------------------
-- progress + workouts
-- ---------------------------------------------------------------------------
create table if not exists progress_entries (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  weight numeric(6,2),
  unit text default 'lb',
  measured_at date not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_progress_client on progress_entries(client_id, measured_at);

create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  booking_id uuid references bookings(id) on delete set null,
  title text not null,
  notes text,
  performed_at timestamptz not null default now()
);
create index if not exists idx_workouts_client on workouts(client_id, performed_at desc);

-- ---------------------------------------------------------------------------
-- referrals
-- ---------------------------------------------------------------------------
create table if not exists referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references profiles(id) on delete cascade,
  referred_id uuid references profiles(id) on delete set null,
  code text not null,
  credited boolean not null default false,
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- Row-Level Security
-- ===========================================================================
alter table profiles enable row level security;
alter table trainers enable row level security;
alter table session_types enable row level security;
alter table availability enable row level security;
alter table bookings enable row level security;
alter table booking_participants enable row level security;
alter table messages enable row level security;
alter table trainer_locations enable row level security;
alter table reviews enable row level security;
alter table subscriptions enable row level security;
alter table favorites enable row level security;
alter table progress_entries enable row level security;
alter table workouts enable row level security;
alter table referrals enable row level security;

-- helper: does the current user own the given trainer row?
create or replace function owns_trainer(t_id uuid) returns boolean as $$
  select exists (
    select 1 from trainers t where t.id = t_id and t.profile_id = auth.uid()
  );
$$ language sql stable security definer;

-- helper: is the current user a participant (client or trainer) in a booking?
create or replace function in_booking(b_id uuid) returns boolean as $$
  select exists (
    select 1 from bookings b
    join trainers t on t.id = b.trainer_id
    where b.id = b_id and (b.client_id = auth.uid() or t.profile_id = auth.uid())
  );
$$ language sql stable security definer;

-- profiles: read own; read trainer profiles (public browse); update own
create policy "profiles read own" on profiles for select using (id = auth.uid());
create policy "profiles read trainers" on profiles for select using (role = 'trainer');
create policy "profiles update own" on profiles for update using (id = auth.uid());
create policy "profiles insert own" on profiles for insert with check (id = auth.uid());

-- trainers: anyone signed in can browse; owner manages own
create policy "trainers read all" on trainers for select using (true);
create policy "trainers manage own" on trainers for all
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- session_types: readable by all; managed by owning trainer
create policy "session_types read" on session_types for select using (true);
create policy "session_types manage" on session_types for all
  using (owns_trainer(trainer_id)) with check (owns_trainer(trainer_id));

-- availability: readable by all; managed by owning trainer
create policy "availability read" on availability for select using (true);
create policy "availability manage" on availability for all
  using (owns_trainer(trainer_id)) with check (owns_trainer(trainer_id));

-- bookings: participants read; client creates; participants update
create policy "bookings read" on bookings for select using (in_booking(id));
create policy "bookings insert" on bookings for insert with check (client_id = auth.uid());
create policy "bookings update" on bookings for update using (in_booking(id));

-- booking participants: readable/insertable by booking participants
create policy "participants read" on booking_participants for select using (in_booking(booking_id));
create policy "participants write" on booking_participants for all
  using (in_booking(booking_id)) with check (in_booking(booking_id));

-- messages: only booking participants
create policy "messages read" on messages for select using (in_booking(booking_id));
create policy "messages insert" on messages for insert
  with check (sender_id = auth.uid() and in_booking(booking_id));

-- trainer_locations: booking participants read; owning trainer writes
create policy "locations read" on trainer_locations for select using (in_booking(booking_id));
create policy "locations write" on trainer_locations for all
  using (in_booking(booking_id)) with check (in_booking(booking_id));

-- reviews: readable by all (public trainer reviews); rater writes own
create policy "reviews read" on reviews for select using (true);
create policy "reviews insert" on reviews for insert with check (rater_id = auth.uid());

-- subscriptions: client reads/manages own
create policy "subs read own" on subscriptions for select using (client_id = auth.uid());
create policy "subs write own" on subscriptions for all
  using (client_id = auth.uid()) with check (client_id = auth.uid());

-- favorites: client manages own
create policy "favorites own" on favorites for all
  using (client_id = auth.uid()) with check (client_id = auth.uid());

-- progress + workouts: client manages own
create policy "progress own" on progress_entries for all
  using (client_id = auth.uid()) with check (client_id = auth.uid());
create policy "workouts own" on workouts for all
  using (client_id = auth.uid()) with check (client_id = auth.uid());

-- referrals: referrer reads own
create policy "referrals own" on referrals for select using (referrer_id = auth.uid());

-- Enable realtime for chat + live location.
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table trainer_locations;
alter publication supabase_realtime add table bookings;
