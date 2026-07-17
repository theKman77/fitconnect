import { supabase, isBackendConfigured } from './supabase';
import { config } from './config';
import { demoBookings, uid } from '@/data/store';
import type { BookingDraft, PriceBreakdown } from '@/context/booking';
import type { Booking, BookingStatus } from '@/types/domain';

/** Create a booking from the draft + computed price. */
export async function createBooking(
  draft: BookingDraft,
  price: PriceBreakdown,
  clientId: string,
): Promise<Booking> {
  const row: Partial<Booking> = {
    client_id: clientId,
    trainer_id: draft.trainer!.id,
    session_type_id: draft.sessionType?.id ?? null,
    status: 'confirmed',
    format: draft.format,
    scheduled_at: draft.scheduledAt?.toISOString() ?? null,
    duration_min: draft.sessionType?.duration_min ?? 60,
    address_line: draft.format === 'in_person' ? draft.addressLine : null,
    city: draft.city,
    virtual_link: draft.format === 'virtual' ? 'https://meet.fitconnect.app/demo' : null,
    is_split: draft.isSplit,
    friend_email: draft.isSplit ? draft.friendEmail : null,
    equipment_by_trainer: draft.equipmentByTrainer,
    equipment_items: draft.equipmentItems,
    base_price: price.base,
    equipment_fee: price.equipmentFee,
    peak_surge: price.peakSurge,
    service_fee: price.serviceFee,
    total: price.total,
    amount_due: price.amountDue,
    // With real payments on, the Moyasar webhook flips this to true once paid.
    paid: !config.paymentsEnabled,
  };

  if (!isBackendConfigured) {
    const booking: Booking = {
      ...(row as Booking),
      id: uid('bk'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lat: draft.trainer!.lat,
      lng: draft.trainer!.lng,
      stripe_checkout_id: null,
      stripe_payment_intent: null,
    };
    demoBookings.set(booking.id, booking);
    return booking;
  }

  const { data, error } = await supabase.from('bookings').insert(row).select().single();
  if (error) throw error;
  return data as Booking;
}

export async function getBooking(id: string): Promise<Booking | undefined> {
  if (!isBackendConfigured) return demoBookings.get(id);
  const { data } = await supabase.from('bookings').select('*').eq('id', id).single();
  return (data as Booking) ?? undefined;
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const booking = demoBookings.get(id);
  if (!isBackendConfigured) {
    if (booking) demoBookings.set(id, { ...booking, status, updated_at: new Date().toISOString() });
    return;
  }
  await supabase.from('bookings').update({ status }).eq('id', id);
}

export async function listMyBookings(clientId: string): Promise<Booking[]> {
  if (!isBackendConfigured) {
    return [...demoBookings.values()].filter((b) => b.client_id === clientId);
  }
  const { data } = await supabase
    .from('bookings')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  return (data as Booking[]) ?? [];
}
