import { supabase, isBackendConfigured } from './supabase';
import { demoBookings, uid } from '@/data/store';
import type { BookingDraft, PriceBreakdown } from '@/context/booking';
import type { Booking, BookingStatus } from '@/types/domain';

/** Create a booking from the draft + computed price. */
export async function createBooking(
  draft: BookingDraft,
  price: PriceBreakdown,
  clientId: string,
): Promise<Booking> {
  if (!draft.trainer || !draft.sessionType || !draft.scheduledAt) {
    throw new Error('Choose a trainer, plan, date, and time before booking.');
  }
  if (draft.scheduledAt.getTime() <= Date.now()) {
    throw new Error('That time has already passed. Choose a future slot.');
  }
  if (draft.format === 'in_person' && (!draft.addressLine.trim() || !draft.city.trim())) {
    throw new Error('Add a complete address and city for an in-person session.');
  }
  if (draft.isSplit) {
    throw new Error('Group split payments are not available in this MVP yet.');
  }
  const input = {
    client_id: clientId,
    trainer_id: draft.trainer.id,
    session_type_id: draft.sessionType?.id ?? null,
    format: draft.format,
    scheduled_at: draft.scheduledAt?.toISOString() ?? null,
    duration_min: draft.sessionType?.duration_min ?? 60,
    address_line: draft.format === 'in_person' ? draft.addressLine : null,
    city: draft.city,
    virtual_link: null,
    is_split: draft.isSplit,
    friend_email: draft.isSplit ? draft.friendEmail : null,
    equipment_by_trainer: draft.equipmentByTrainer,
    equipment_items: draft.equipmentItems,
  };

  if (!isBackendConfigured) {
    const booking: Booking = {
      ...(input as Booking),
      id: uid('bk'),
      status: 'confirmed',
      base_price: price.base,
      equipment_fee: price.equipmentFee,
      peak_surge: price.peakSurge,
      service_fee: price.serviceFee,
      total: price.total,
      amount_due: price.amountDue,
      paid: false,
      payment_status: 'simulation',
      payment_provider: 'demo',
      quoted_at: new Date().toISOString(),
      trainer_fee_rate: 0.1,
      trainer_platform_fee: Math.round((price.base + price.equipmentFee + price.peakSurge) * 0.1 * 100) / 100,
      trainer_payout: Math.round((price.base + price.equipmentFee + price.peakSurge) * 0.9 * 100) / 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lat: draft.trainer.lat,
      lng: draft.trainer.lng,
      stripe_checkout_id: null,
      stripe_payment_intent: null,
    };
    demoBookings.set(booking.id, booking);
    return booking;
  }

  const { data, error } = await supabase.from('bookings').insert(input).select().single();
  if (error) throw error;
  const booking = data as Booking;
  // Alert the trainer via push (fire-and-forget; never blocks the booking).
  supabase.functions.invoke('notify-trainer', { body: { bookingId: booking.id } }).catch(() => {});
  return booking;
}

export async function getBooking(id: string): Promise<Booking | undefined> {
  if (!isBackendConfigured) return demoBookings.get(id);
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
  if (error) throw error;
  return (data as Booking) ?? undefined;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const booking = demoBookings.get(id);
  if (!isBackendConfigured) {
    if (booking) demoBookings.set(id, { ...booking, status, updated_at: new Date().toISOString() });
    return;
  }
  const { error } = await supabase.rpc('advance_booking_status', { p_booking_id: id, p_next: status });
  if (error) throw error;
}

export async function cancelBooking(id: string): Promise<void> {
  if (!isBackendConfigured) {
    const booking = demoBookings.get(id);
    if (booking) demoBookings.set(id, { ...booking, status: 'cancelled', updated_at: new Date().toISOString() });
    return;
  }
  const { error } = await supabase.rpc('cancel_my_booking', { p_booking_id: id });
  if (error) throw error;
}

export async function listMyBookings(clientId: string): Promise<Booking[]> {
  if (!isBackendConfigured) {
    return [...demoBookings.values()].filter((b) => b.client_id === clientId);
  }
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as Booking[]) ?? [];
}
