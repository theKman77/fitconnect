-- INSERT .. RETURNING on bookings failed RLS: the SELECT policy relied solely on
-- the STABLE helper in_booking(), which can't see the row being inserted in the
-- same statement. Let clients match their own rows directly; trainers still
-- read through the helper.
-- Applied to the live DB on 2026-07-17 via the Supabase connector.
drop policy "bookings read" on public.bookings;
create policy "bookings read" on public.bookings for select
  using (client_id = auth.uid() or public.in_booking(id));
