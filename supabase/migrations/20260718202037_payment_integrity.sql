-- Immutable provider event ledger used by payment webhooks and push delivery.
-- Authenticated clients receive no direct access to either table.

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  booking_id uuid references public.bookings(id) on delete set null,
  event_type text not null,
  amount_halalas bigint,
  currency text,
  status text not null default 'received',
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id),
  check (amount_halalas is null or amount_halalas >= 0),
  check (currency is null or char_length(currency) = 3),
  check (status in ('received', 'processed', 'rejected', 'failed'))
);

alter table public.payment_events enable row level security;
revoke all on public.payment_events from anon, authenticated;
grant select, insert, update on public.payment_events to service_role;

create index if not exists idx_payment_events_booking
on public.payment_events (booking_id, created_at desc);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  status text not null default 'pending',
  provider_response jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (booking_id, recipient_id, event_type),
  check (status in ('pending', 'sent', 'skipped', 'failed'))
);

alter table public.notification_events enable row level security;
revoke all on public.notification_events from anon, authenticated;
grant select, insert, update on public.notification_events to service_role;

create index if not exists idx_notification_events_recipient
on public.notification_events (recipient_id, created_at desc);
