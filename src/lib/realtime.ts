/**
 * Realtime subscriptions for a single booking row (status changes, and later
 * live location). Live mode uses Supabase Realtime; demo mode is a no-op since
 * status is simulated locally.
 */
import { supabase, isBackendConfigured } from './supabase';
import type { Booking, TrainerLocation } from '@/types/domain';

/** Subscribe to updates on one booking. Returns an unsubscribe function. */
export function subscribeBooking(bookingId: string, onUpdate: (b: Booking) => void): () => void {
  if (!isBackendConfigured) return () => {};
  const channel = supabase
    .channel(`booking:${bookingId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${bookingId}` },
      (payload) => onUpdate(payload.new as Booking),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Trainer writes their current position for a booking (live tracking). */
export async function pushTrainerLocation(
  bookingId: string,
  lat: number,
  lng: number,
  etaMinutes?: number,
): Promise<void> {
  if (!isBackendConfigured) return;
  await supabase.from('trainer_locations').upsert({
    booking_id: bookingId,
    lat,
    lng,
    eta_minutes: etaMinutes ?? null,
    updated_at: new Date().toISOString(),
  });
}

/** Client subscribes to the trainer's live position for a booking. */
export function subscribeTrainerLocation(
  bookingId: string,
  onUpdate: (loc: TrainerLocation) => void,
): () => void {
  if (!isBackendConfigured) return () => {};
  const channel = supabase
    .channel(`location:${bookingId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'trainer_locations', filter: `booking_id=eq.${bookingId}` },
      (payload) => onUpdate(payload.new as TrainerLocation),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
