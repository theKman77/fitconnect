-- Follow-up from Supabase security/performance advisors.
-- These two account-owned workflows do not need to bypass RLS.
alter function public.become_trainer() security invoker;
alter function public.submit_trainer_application() security invoker;

create index if not exists referrals_referrer_idx on public.referrals (referrer_id);
create index if not exists referrals_referred_idx on public.referrals (referred_id);

drop policy if exists "referrals own" on public.referrals;
create policy "referrals own" on public.referrals for select
to authenticated using (referrer_id = (select auth.uid()));
