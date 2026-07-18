import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.7';

const WEBHOOK_SECRET = Deno.env.get('MOYASAR_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function response(message: string, status: number): Response {
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain' } });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return response('method not allowed', 405);
  if (!WEBHOOK_SECRET) return response('webhook unavailable', 503);

  try {
    const payload = await req.json();
    const suppliedSecret = req.headers.get('x-moyasar-secret') ?? payload?.secret_token ?? '';
    if (!suppliedSecret || suppliedSecret !== WEBHOOK_SECRET) return response('forbidden', 403);

    const data = payload?.data ?? payload;
    const providerPaymentId = data?.id;
    const bookingId = data?.metadata?.booking_id;
    const eventType = payload?.type ?? `payment_${data?.status ?? 'unknown'}`;
    const amountHalalas = Number(data?.amount);
    const currency = String(data?.currency ?? '').toUpperCase();
    const isPaid = eventType === 'payment_paid' || data?.status === 'paid';

    if (!providerPaymentId || !bookingId) return response('invalid event metadata', 400);

    const service = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { error: eventError } = await service.from('payment_events').insert({
      provider: 'moyasar',
      provider_event_id: providerPaymentId,
      booking_id: bookingId,
      event_type: eventType,
      amount_halalas: Number.isFinite(amountHalalas) ? amountHalalas : null,
      currency: currency || null,
      payload,
      status: 'received',
    });

    if (eventError?.code === '23505') return response('duplicate', 200);
    if (eventError) return response('could not record event', 500);

    const { data: booking, error: bookingError } = await service
      .from('bookings')
      .select('id,amount_due,payment_status,status,stripe_checkout_id')
      .eq('id', bookingId)
      .single();

    const expectedHalalas = booking ? Math.round(Number(booking.amount_due) * 100) : -1;
    const valid = Boolean(
      booking
      && !bookingError
      && isPaid
      && currency === 'SAR'
      && Number.isSafeInteger(amountHalalas)
      && amountHalalas === expectedHalalas
      && booking.payment_status === 'pending'
      && (!booking.stripe_checkout_id || booking.stripe_checkout_id === data?.invoice_id || booking.stripe_checkout_id === data?.invoice?.id),
    );

    if (!valid) {
      await service.from('payment_events').update({
        status: 'rejected',
        error: 'Booking, status, invoice, amount, or currency did not match',
        processed_at: new Date().toISOString(),
      }).eq('provider', 'moyasar').eq('provider_event_id', providerPaymentId);
      return response('event rejected', 400);
    }

    const { error: bookingUpdateError } = await service
      .from('bookings')
      .update({
        paid: true,
        payment_status: 'paid',
        payment_provider: 'moyasar',
        status: 'confirmed',
        stripe_payment_intent: providerPaymentId,
      })
      .eq('id', bookingId)
      .eq('payment_status', 'pending');

    if (bookingUpdateError) {
      await service.from('payment_events').update({
        status: 'failed', error: bookingUpdateError.message, processed_at: new Date().toISOString(),
      }).eq('provider', 'moyasar').eq('provider_event_id', providerPaymentId);
      return response('booking update failed', 500);
    }

    await service.from('payment_events').update({
      status: 'processed', processed_at: new Date().toISOString(),
    }).eq('provider', 'moyasar').eq('provider_event_id', providerPaymentId);
    return response('ok', 200);
  } catch {
    return response('invalid webhook payload', 400);
  }
});
