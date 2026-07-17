// Supabase Edge Function: moyasar-webhook
// Moyasar calls this after a payment. We verify a shared secret and mark the
// booking as paid. This is the authoritative confirmation of payment.
//
// Deploy: supabase functions deploy moyasar-webhook --no-verify-jwt
// Secrets:
//   supabase secrets set MOYASAR_WEBHOOK_SECRET=some-long-random-string
// Then in the Moyasar dashboard add a webhook pointing to this function's URL
// with the same secret token, subscribed to the "payment_paid" event.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const WEBHOOK_SECRET = Deno.env.get('MOYASAR_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  try {
    const payload = await req.json();

    // Moyasar includes the configured secret token on the payload.
    if (WEBHOOK_SECRET && payload?.secret_token && payload.secret_token !== WEBHOOK_SECRET) {
      return new Response('forbidden', { status: 403 });
    }

    const data = payload?.data ?? payload;
    const bookingId = data?.metadata?.booking_id;
    const status = data?.status;
    const isPaid = payload?.type === 'payment_paid' || status === 'paid';

    if (bookingId && isPaid) {
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
      await supabase
        .from('bookings')
        .update({ paid: true, status: 'confirmed', stripe_payment_intent: data?.id ?? null })
        .eq('id', bookingId);
    }

    return new Response('ok', { status: 200 });
  } catch (e) {
    return new Response(`error: ${e}`, { status: 500 });
  }
});
